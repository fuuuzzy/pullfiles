import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx'; // 请确保项目中已安装 xlsx，或运行 npm i xlsx

// 获取配置和文件路径
const REQUEST_JSON_PATH = path.resolve(process.cwd(), 'request.json');
const EXCEL_PATH = path.resolve(process.cwd(), 'docs', 'v.xlsx');
const SYNC_API_URL = 'https://studio.luckyshort.net/intranet/episodes/all-sync';

// 读取 request.json
if (!fs.existsSync(REQUEST_JSON_PATH)) {
  console.error(`未找到 request.json 文件: ${REQUEST_JSON_PATH}`);
  process.exit(1);
}
const requestData = JSON.parse(fs.readFileSync(REQUEST_JSON_PATH, 'utf8'));

// 读取 Excel 文件
if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`未找到剧单表格: ${EXCEL_PATH}`);
  process.exit(1);
}
const workbook = xlsx.readFile(EXCEL_PATH, { cellDates: true });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawJson = xlsx.utils.sheet_to_json(worksheet);

// 解析 Excel 数据
const rows = rawJson.map(rawRow => {
  const row = {};
  for (const [key, value] of Object.entries(rawRow)) {
    row[key.trim()] = value;
  }
  return {
    title: String(row.剧标题 ?? '').trim(),
    episodeNo: String(row.剧编号 ?? '').trim(),
    language: row.语言 ? String(row.语言).trim() : '',
    description: row.剧英文简介 ? String(row.剧英文简介).trim() : '',
    totalParts: row.集数 ? Number(row.集数) : null
  };
}).filter(r => r.title && r.episodeNo);

console.log(`从 Excel 中解析到 ${rows.length} 条剧集信息。`);

// 组装并发送请求
async function main() {
  let successCount = 0;
  let failCount = 0;

  for (const row of rows) {
    // 根据剧名去 request.json 中匹配文件夹
    // 1. 尝试精准全匹配
    let matchDir = requestData.find(d => d.dir === row.title);
    
    if (!matchDir) {
      // 2. 如果没有，则提取出剧名和文件夹名的全部字符(去掉空格、符号等特殊字符)，转小写后进行匹配
      const extractChars = (str) => String(str).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
      const normalizedTitle = extractChars(row.title);

      matchDir = requestData.find(d => {
        const normalizedDir = extractChars(d.dir);
        // 如果提取后的字符完全相等，或者相互包含，就认为是匹配的
        return normalizedDir === normalizedTitle || 
               normalizedDir.includes(normalizedTitle) || 
               normalizedTitle.includes(normalizedDir);
      });
    }

    if (!matchDir) {
      console.warn(`[跳过] 无法在 request.json 中匹配到剧名对应的文件夹: ${row.title}`);
      failCount++;
      continue;
    }

    const videoFiles = [];
    const imageFiles = [];

    // 区分视频和图片
    for (const file of matchDir.list) {
      const isVideo = file.content_type === 1 || /\.(mp4|avi|mkv|mov|flv|wmv)$/i.test(file.filename);
      const isImage = file.content_type === 3 || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);
      
      if (isVideo) videoFiles.push(file);
      else if (isImage) imageFiles.push(file);
    }

    if (videoFiles.length === 0) {
      console.warn(`[警告] 剧集 ${row.title} 在匹配的文件夹 [${matchDir.dir}] 中没有找到视频文件，将跳过。`);
      failCount++;
      continue;
    }

    // 组装 API Payload
    const parts = videoFiles.map(file => ({
      taskId: file.file_id,
      originalName: file.filename,
      transtoreStatus: "no_transtore",
      uploadUrl: file.url,
      addWay: "upload",
      partIdx: file.part_idx !== null ? file.part_idx : 0
    }));

    const posters = imageFiles.map((file, idx) => ({
      taskId: file.file_id,
      originalName: file.filename,
      uploadUrl: file.url,
      type: "general",
      title: row.title,
      defaulted: true,
      horizontal: false,
      remark: ""
    }));

    const payload = {
      remark: "百度云",
      episodeNo: row.episodeNo,
      title: row.title,
      language: row.language,
      alias: row.title,
      episodeDesc: {
        intro: row.description,
        description: row.description,
        subtitle: "",
        tags: [],
        categories: []
      },
      episodeCopyright: {
        releasedBy: "luckyshort",
        startedAt: "2026-05-14",
        endAt: "2099-01-01"
      },
      parts,
      posters
    };

    // 发送请求
    console.log(`\n正在同步剧集: ${row.title} (匹配文件夹: ${matchDir.dir}) | 视频: ${parts.length} 个, 封面: ${posters.length} 个`);
    try {
      const res = await fetch(SYNC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': 'eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uLWlkIjoiZTNiOGMxYjktODA1MC00NjE5LWFjMDUtZTdhODUyMDY1ZmU0IiwiYnV0dG9uLXBlcm1pc3Npb25zIjpbXSwiZXhwIjoxNzc5MzMxOTA0LCJ1c2VybmFtZSI6IkFPRU1PIiwibWVudS1wZXJtaXNzaW9ucyI6W10sInVzZXItaWQiOjQwLCJuYmYiOjE3Nzg3MjcxMDQsInRhc2stZHVyYXRpb24tbGltaXQiOi0xLCJyb2xlLWlkIjoxNSwiaWF0IjoxNzc4NzI3MTA0fQ.IdGpm1thsSzuPTqKhhOriOiXm87ymwbY_21j6Xc71V8'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`[成功] ${row.title} 同步完成！ HTTP ${res.status}`);
        successCount++;
      } else {
        const errText = await res.text();
        console.error(`[失败] ${row.title} 同步出错！ HTTP ${res.status} - ${errText}`);
        failCount++;
      }
    } catch (err) {
      console.error(`[错误] 请求异常 ${row.title}:`, err.message);
      failCount++;
    }
  }

  console.log('\n====== 同步执行摘要 ======');
  console.log(`总剧单数量: ${rows.length}`);
  console.log(`成功同步: ${successCount}`);
  console.log(`同步失败或跳过: ${failCount}`);
  console.log('==========================\n');
}

main();