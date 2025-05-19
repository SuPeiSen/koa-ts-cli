import { spawn } from "child_process";
import path from "path";

const projectPath = process.cwd();

function build() {
  console.log("clean build");
  const buildDir = path.join(projectPath, "build");
  // 使用 spawn 删除构建目录
  spawn("rm", ["-rf", buildDir], {
    stdio: "inherit",
  });

  console.log("开始构建项目...");
  const tsConfig = path.join(projectPath, "tsconfig.json");

  // 使用 spawn 运行 TypeScript 编译器
  const tscProcess = spawn("tsc", ["-p", tsConfig], {
    stdio: "inherit",
  });

  // 监听编译过程结束事件
  tscProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`构建失败，退出码: ${code}`);
      return;
    }
    console.log("构建成功!");
  });
}

export default build;
