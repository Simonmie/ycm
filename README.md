# ycm

Yarn Cache Manager - 一个用于管理和分享 yarn 缓存的工具

## 功能

- 启动缓存分享服务
- 从其他人的服务同步缓存

## 使用方法

```bash
# 分享方：启动缓存分享服务（默认端口3000）
ncm serve [port]

# 接收方：从分享服务同步缓存
ncm sync http://分享方IP:端口

# 例如：
ncm sync http://192.168.1.100:3000
```
