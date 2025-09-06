import { spawn } from "child_process";
import chokidar from "chokidar";
import { existsSync } from "fs";
import path from "path";
import chalk from "chalk";

chalk.level = 3;

// 当前执行的项目路径
const projectPath = process.cwd();
let childProcess;

// 启动 TypeScript 进程
const startProcess = () => {
  const mainFile = path.join(projectPath, "src", "index.ts");
  const tsConfig = path.join(projectPath, "tsconfig.json");

  // 使用 npx 执行 ts-node 来运行 TypeScript 文件
  childProcess = spawn(
    "npx",
    ["ts-node", "-r", "tsconfig-paths/register", mainFile, "-P", tsConfig],
    {
      stdio: "inherit", // 继承父进程的标准输入输出
      env: {
        ...process.env, // 继承父进程的环境变量
        NODE_ENV: "development", // 设置环境变量为开发环境
        FORCE_COLOR: "3", // 强制颜色输出
      },
    }
  );

  // 错误处理
  childProcess.on("error", (error) => {
    console.error(`Failed to start subprocess: ${error.message}`);
  });

  // 监听子进程退出事件
  childProcess.on("exit", (code) => {
    if (code !== 0) {
      console.log(`Child process exited with code ${code}`);
    }
  });
};

// 加载 chokidar 的配置文件
const loadChokidarConfig = async () => {
  const configPath = path.join(projectPath, "chokidar.config.js");

  // 检查配置文件是否存在
  if (existsSync(configPath)) {
    // 动态导入配置文件并返回默认导出
    const config = await import(configPath);

    if (Object.keys(config.default.default).length > 0) {
      console.log(chalk.green(`load chokidar config success:`), configPath);
    }

    return config.default.default || {};
  }

  // 如果不存在，返回默认空对象
  return {};
};

// 开发服务的核心功能
const devService = async () => {
  // 加载 chokidar 配置
  const chokidarConfig = await loadChokidarConfig();
  const watchPath = chokidarConfig.watchPath || [path.join(projectPath, "src")];
  // 输出监视的路径
  watchPath.forEach((p, index) => {
    console.log(`${chalk.green("Watching path in")}: ${p}`);
  });

  // 创建文件监视器
  const watcher = chokidar.watch(watchPath, {
    ignored: [/(^|[\/\\])\../], // 忽略隐藏文件
    persistent: true, // 持续监视
    ignoreInitial: true, // 忽略初始文件扫描
    awaitWriteFinish: true, // 等待写入完成
    ...chokidarConfig, // 合并自定义配置
  });

  // 监听所有事件
  watcher.on("all", (eventName, listener) => {
    console.log(`${eventName} => ${listener}`);

    // 如果子进程存在，先终止它
    if (childProcess) {
      console.log(chalk.red("\nrestart service ..."));
      childProcess.kill();
    }

    // 重新启动子进程
    startProcess();
  });

  // 启动初始的子进程
  startProcess();
};

export default devService;
