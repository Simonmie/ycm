#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { execSync } from "child_process";
import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import fetch from "node-fetch";
import extract from "extract-zip";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import ProgressBar from "progress";

const getCachePath = () => {
  try {
    return execSync("yarn cache dir", { encoding: "utf-8" }).trim();
  } catch (error) {
    console.error("获取yarn缓存路径失败，请确保已安装yarn");
    process.exit(1);
  }
};

const startServer = (port) => {
  const app = express();
  const cachePath = getCachePath();

  app.get("/download", async (req, res) => {
    const archive = archiver("zip", { zlib: { level: 9 } });

    // 错误处理
    archive.on("error", (err) => {
      console.error("压缩错误:", err);
      res.status(500).end();
    });

    // 等待压缩完成后再发送
    await new Promise((resolve) => {
      archive.on("end", () => {
        console.log("压缩完成，文件大小:", archive.pointer());
        resolve();
      });

      res.attachment("yarn-cache.zip");
      archive.pipe(res);
      archive.directory(cachePath, false);
      archive.finalize();
    });
  });

  app.listen(port, () => {
    console.log(`服务已启动在 http://localhost:${port}`);
    console.log(`其他用户可以使用以下命令同步缓存：`);
    console.log(`ncm sync http://localhost:${port}`);
  });
};

const syncFromServer = async (serverUrl) => {
  const tmpPath = path.join(tmpdir(), `yarn-cache-${Date.now()}.zip`);
  const cachePath = getCachePath();

  console.log("yarn缓存目录:", cachePath);
  console.log("临时下载路径:", tmpPath);

  try {
    console.log("\n开始下载缓存文件...");
    const response = await fetch(`${serverUrl}/download`);
    const total = parseInt(response.headers.get("content-length"), 10) || 0;

    if (total > 0) {
      console.log(`预计文件大小: ${(total / 1024 / 1024).toFixed(2)} MB`);
    }

    let downloaded = 0;
    const showProgress = () => {
      process.stdout.write(
        `已下载: ${(downloaded / 1024 / 1024).toFixed(2)} MB ${
          total ? `(${((downloaded * 100) / total).toFixed(1)}%)` : ""
        }\r`
      );
    };

    const fileStream = createWriteStream(tmpPath);
    await new Promise((resolve, reject) => {
      response.body.on("data", (chunk) => {
        downloaded += chunk.length;
        showProgress();
      });

      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    console.log("\n开始解压缓存文件...");
    console.log(`正在解压到: ${cachePath}`);
    await extract(tmpPath, { dir: cachePath });

    const finalSize = fs.statSync(tmpPath).size;
    console.log(`下载文件大小: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log("缓存同步完成！");
  } catch (error) {
    console.error("同步失败:", error.message);
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
};

yargs(hideBin(process.argv))
  .command(
    "serve [port]",
    "启动缓存分享服务",
    (yargs) => {
      return yargs.positional("port", {
        describe: "服务端口",
        default: 3000,
        type: "number",
      });
    },
    (argv) => {
      startServer(argv.port);
    }
  )
  .command(
    "sync <url>",
    "从服务器同步缓存",
    (yargs) => {
      return yargs.positional("url", {
        describe: "服务器地址",
        type: "string",
      });
    },
    (argv) => {
      syncFromServer(argv.url);
    }
  )
  .demandCommand(1, "请指定要执行的命令")
  .help().argv;
