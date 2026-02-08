# SPEC-09: 数据持久化 — 任务清单

> 状态: 待开始

## 实现任务

- [ ] 定义 Storage namespace 和 StorageNotFoundError
- [ ] 实现 init（设置 baseDir）
- [ ] 实现 write（JSON 序列化 + 自动创建目录）
- [ ] 实现 read（JSON 反序列化 + 错误处理）
- [ ] 实现 remove（删除文件）
- [ ] 实现 exists（检查文件存在性）
- [ ] 实现 list（遍历目录下所有 JSON 文件）
- [ ] 实现 reset（清空状态，测试用）

## 测试任务

- 写入和读取数据
- 删除数据
- 读取不存在的 key 抛出错误
- 列出指定前缀下的键
- 检查存在性

## 验收标准

- Storage CRUD 全部实现
- 所有单元测试通过
- 支持嵌套路径和自动创建目录
- 正确的错误处理
