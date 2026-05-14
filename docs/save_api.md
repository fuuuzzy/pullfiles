### 保存剧集信息

- Request
    - Path: `https://studio.luckyshort.net/intranet/episodes/all-sync`
    - Method: `post`
    - Body:
      ```json5
       {
       // 备注 默认百度云
       "remark": "百度云",
       // 剧编号
       "episodeNo": "xx",
       // 剧标题
       "title": "xx",
       // 语言
       "language": "xx",
       // 也是用剧标题
       "alias": "xx",
       "episodeDesc": {
       // 剧简介
       "intro": "",
       // 剧简介
       "description": "",
       // 留空
       "subtitle": "",
       // 留空
       "tags": [],
       // 留空
       "categories": []
       },
       // 固定值
       "episodeCopyright": {
       "releasedBy": "luckyshort",
       "startedAt": "2026-01-05",
       "endAt": "2099-01-01"
       },
       "parts": [
       {
       // 任务id 百度云文件id
       "taskId": "xxx",
       // 文件名
       "originalName": "xxx",
       // 默认值
       "transtoreStatus": "transtore",
       // 文件url 取r2的url
       "uploadUrl": "xxx",
       // 类型 默认upload
       "addWay": "upload",
       // 集数
       "partIdx": 12
       }
       ],
       "posters": [
       {
       // 任务id 百度云文件id
       "taskId": "",
       // 文件名
       "originalName": "xx",
       // 文件url，取r2的url
       "uploadUrl": "xx",
       // 默认值
       "type": "general",
       // 剧标题
       "title": "xx",
       // 默认值
       "defaulted": true,
       // 默认值
       "horizontal": false,
       "remark": ""
       }
       ]
       }
       ```

- Response
  - httpStatus: 200