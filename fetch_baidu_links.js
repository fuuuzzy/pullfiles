import fs from 'node:fs';
import path from 'node:path';

// 简单解析 .env 文件
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('未找到 .env 文件，请确保在项目根目录运行并包含 BAIDU_ACCESS_TOKEN');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const accessToken = env['BAIDU_ACCESS_TOKEN'];
if (!accessToken) {
  console.error('在 .env 中未找到 BAIDU_ACCESS_TOKEN');
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('用法: node fetch_baidu_links.js <百度云目标路径>');
  process.exit(1);
}

const BASE_URL = 'https://pan.baidu.com/rest/2.0/xpan';

function buildUrl(base, params) {
  const url = new URL(base);
  url.searchParams.set('access_token', accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'pan.baidu.com' } });
  if (!res.ok) {
    throw new Error(`API 请求失败: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.errno && data.errno !== 0) {
    throw new Error(`API 返回错误 (errno: ${data.errno}): ${data.errmsg || '未知错误'}`);
  }
  return data;
}

// 获取目录下的所有文件（排除文件夹）
async function listAllFiles(targetPath) {
  const allFiles = [];
  let start = 0;
  const limit = 1000;

  console.log(`正在获取目录 ${targetPath} 下的所有文件...`);
  while (true) {
    const url = buildUrl(`${BASE_URL}/multimedia`, {
      method: 'listall',
      path: targetPath,
      start: String(start),
      limit: String(limit),
      recursion: '1',
      order: 'time'
    });

    const data = await fetchJson(url);
    const files = data.list || [];
    allFiles.push(...files.filter(f => f.isdir === 0));

    if (files.length < limit) break;
    start += limit;
  }
  console.log(`成功获取 ${allFiles.length} 个文件信息。`);
  return allFiles;
}

// 批量获取文件的 dlink（下载链接）
async function getFileMetas(fsIds) {
  const allMetas = [];
  const batchSize = 100;
  
  console.log('正在获取所有文件的详细信息及下载链接...');
  for (let i = 0; i < fsIds.length; i += batchSize) {
    const batch = fsIds.slice(i, i + batchSize);
    const url = buildUrl(`${BASE_URL}/multimedia`, {
      method: 'filemetas',
      fsids: JSON.stringify(batch),
      dlink: '1',
      from_apaas: '1'
    });

    const data = await fetchJson(url);
    allMetas.push(...(data.list || []));
  }
  return allMetas;
}

function parsePartIdx(filename) {
  // 匹配 EP05, ep 5, Part.05, 第5集, 等等
  const match = filename.match(/(?:ep|part|第)[\s_.-]*(\d+)(?:集|话|期)?/i);
  if (match) return parseInt(match[1], 10);
  
  // 匹配数字在前的后缀模式，如 05集, 05part
  const matchSuffix = filename.match(/(\d+)[\s_.-]*(?:集|话|期|part|ep)/i);
  if (matchSuffix) return parseInt(matchSuffix[1], 10);

  // 或者直接提取最后一个数字序列
  const numbers = filename.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[numbers.length - 1], 10);
  }
  return null;
}

async function main() {
  try {
    const files = await listAllFiles(inputPath);
    if (files.length === 0) {
      console.log('没有找到任何文件。');
      return;
    }

    const fsIds = files.map(f => f.fs_id);
    const metas = await getFileMetas(fsIds);
    
    // 建立 fs_id 到 meta 的映射
    const metaMap = new Map();
    metas.forEach(m => metaMap.set(m.fs_id, m));

    // 按上一级目录分组
    const grouped = {};
    for (const file of files) {
      const parentDir = file.path.split('/').slice(-2, -1)[0] || '根目录';
      if (!grouped[parentDir]) {
        grouped[parentDir] = [];
      }

      const meta = metaMap.get(file.fs_id);
      if (!meta) continue;

      grouped[parentDir].push({
        file_id: String(file.fs_id),
        filename: file.server_filename || file.filename,
        part_idx: parsePartIdx(file.server_filename || file.filename),
        content_type: meta.category, // 类别
        url: meta.dlink // 下载链接
      });
    }

    // 组装最终 JSON 格式
    const result = Object.keys(grouped).map(dir => ({
      dir,
      list: grouped[dir]
    }));

    const outputPath = path.resolve(process.cwd(), 'request.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\n已成功将文件链接提取并按目录分组！\n结果已写入：${outputPath}`);

    console.log('\n====== 统计摘要 ======');
    console.log(`总共提取了 ${result.length} 个文件夹`);
    result.forEach(group => {
      let videoCount = 0;
      let imageCount = 0;
      let otherCount = 0;

      group.list.forEach(file => {
        // category: 1 视频, 3 图片。加入扩展名兜底以防分类不准
        const isVideo = file.content_type === 1 || /\.(mp4|avi|mkv|mov|flv|wmv)$/i.test(file.filename);
        const isImage = file.content_type === 3 || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);
        
        if (isVideo) {
          videoCount++;
        } else if (isImage) {
          imageCount++;
        } else {
          otherCount++;
        }
      });

      console.log(`- 文件夹 [${group.dir}]:`);
      console.log(`    视频文件: ${videoCount} 个`);
      console.log(`    图片文件: ${imageCount} 个`);
      if (otherCount > 0) {
        console.log(`    其他文件: ${otherCount} 个`);
      }
    });
    console.log('======================\n');

  } catch (err) {
    console.error('发生错误:', err.message);
  }
}

main();