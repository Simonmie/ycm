# ycm

Yarn Cache Manager - 一个用于管理和分享 yarn 缓存的工具

## 功能

- 启动缓存分享服务
- 从其他人的服务同步缓存

## 使用方法

```bash
# 分享方：启动缓存分享服务（默认端口3000）
ycm serve [port]
# 接收方：从分享服务同步缓存
yarn install --registry= [目标地址]
```
