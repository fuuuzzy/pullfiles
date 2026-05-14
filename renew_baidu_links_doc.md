# 百度云视频链接过期换新文档

## 为什么视频链接会过期？

百度云网盘的直接下载链接 (`dlink`) 包含由服务器签发的签名 (`sign`) 和时间戳。出于安全限制，这个链接并不是永久有效的（通常有效期在 8 小时左右）。如果获取到链接后未能及时下载完毕，再去访问或使用该 `dlink` 时就会遇到 HTTP `403 Forbidden` 或其他错误，提示链接已过期。

## 如何处理过期链接？

当系统或者业务逻辑在下载文件时捕获到过期错误，需要使用之前保存的文件的唯一标识符（即 `fs_id` 或 `file_id`）重新调用百度云 API 来获取最新的 `dlink`。

### 具体步骤与 API 调用：

利用已有的 `fs_id`，调用 `filemetas` 接口：

**1. 请求接口 (GET)**
```text
https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&access_token=【你的AccessToken】&fsids=[1234567890]&dlink=1&from_apaas=1
```
*(注意：`fsids` 字段是包含文件 ID 的 JSON 数组字符串，例如 `[1234567890]`)*

**2. 响应结果**
API 会返回文件的最新信息，包括一个全新的 `dlink`。
```json
{
  "errno": 0,
  "list": [
    {
      "fs_id": 1234567890,
      "filename": "example.mp4",
      "dlink": "https://d.pcs.baidu.com/file/... (新的下载链接)",
      "size": 1024000
    }
  ]
}
```

**3. 使用新链接**
获取到新的 `dlink` 后，可以继续发起下载请求。请注意，请求新的 `dlink` 时，同样需要在 URL 参数中拼上 `access_token` 或带上特定的请求头（`User-Agent: pan.baidu.com`）。

### 在现有项目中的参考实现

该项目在 `packages/backend/src/services/baidu-pan.ts` 中的 `getFileMetas(fsIds: number[])` 函数已经封装了这个逻辑。
在 `downloadFile` 方法中，如果是普通网络波动会有重试机制；如果是过期（如 `403`/`410`），会抛出包含 `expired link` 的异常。

**如果想在代码中自动换新：**
可以在下载任务报错时，捕获异常并重新调用 `getFileMetas([fs_id])` 获取新的 `dlink`，然后替换数据库或内存中的旧链接，并重新开启下载流。