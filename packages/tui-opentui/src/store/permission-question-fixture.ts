/**
 * Permission/Question 演示数据
 *
 * 用于测试 Overlay 功能，后续接入真实 Core 事件
 */

import type { PermissionRequest, QuestionRequest } from "./ui-store.js";

/** 示例权限请求 */
export const samplePermissionRequest: PermissionRequest = {
  id: "perm-1",
  type: "file_write",
  resource: "/vol4/Agent/deepreef/src/parser.ts",
  description: "Worker qwen-1.5b 请求写入文件",
};

/** 示例询问请求 */
export const sampleQuestionRequest: QuestionRequest = {
  id: "q-1",
  question: "检测到文件冲突，如何处理？",
  options: ["覆盖", "跳过", "合并", "查看差异"],
  allowFreeInput: false,
  source: "worker/qwen-1.5b",
};

/** 自由输入类型的询问 */
export const sampleFreeformQuestion: QuestionRequest = {
  id: "q-2",
  question: "请输入你的 API Key:",
  allowFreeInput: true,
  source: "supervisor/deepseek",
};
