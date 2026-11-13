/**
 * dsh-sheetmetal — 钣金展开与 DFM 检查
 *
 * 三个工具：折弯展开、多段展开、DFM 检查。
 * 公式：BA = θ(rad) × (R + K·T)；BD = 2(R+T)tan(θ/2) − BA
 */

export const name = "dsh-sheetmetal";

export const inject = ["tools"];

const NL = String.fromCharCode(10);

const TEXT_OUTPUT = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

const DEG = Math.PI / 180;
const SITE = "https://deepseekbase.com/zh/tools/";

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function fmt(n) {
  return (Math.round(n * 1000) / 1000).toString();
}

function bend(thickness, angleDeg, radius, k) {
  const T = num(thickness, 0);
  const A = num(angleDeg, 0);
  const R = num(radius, 0);
  const K = num(k, 0.44);
  if (T <= 0) throw new Error("厚度必须大于 0");
  if (A <= 0 || A > 180) throw new Error("折弯角度需在 0~180 之间");
  if (R < 0) throw new Error("内半径不能为负");
  const rad = A * DEG;
  const ba = rad * (R + K * T);
  const bd = 2 * (R + T) * Math.tan(rad / 2) - ba;
  return { T, A, R, K, ba, bd };
}

const TOOLS = {
  sheetmetal_bend: {
    description: "钣金单折弯展开：输入厚度、角度、内半径、K 因子，输出折弯补偿 BA、折弯扣除 BD 与展开长度",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        thickness: { type: "number", description: "板厚 mm" },
        angle: { type: "number", description: "折弯角度（度），如 90" },
        radius: { type: "number", description: "内侧折弯半径 mm" },
        k: { type: "number", description: "K 因子，默认 0.44" },
        legs: { type: "number", description: "两边直边总长 mm（可选），给出则算展开长度" },
      },
      required: ["thickness", "angle", "radius"],
    },
    run(args) {
      const r = bend(args.thickness, args.angle, args.radius, args.k);
      const lines = [
        "钣金折弯展开",
        "=".repeat(48),
        "板厚 T: " + fmt(r.T) + " mm",
        "角度: " + fmt(r.A) + "°",
        "内半径 R: " + fmt(r.R) + " mm",
        "K 因子: " + fmt(r.K),
        "折弯补偿 BA: " + fmt(r.ba) + " mm",
        "折弯扣除 BD: " + fmt(r.bd) + " mm",
      ];
      if (args.legs != null) {
        lines.push("直边合计: " + fmt(num(args.legs, 0)) + " mm");
        lines.push("展开长度: " + fmt(num(args.legs, 0) - r.bd) + " mm");
      }
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  sheetmetal_flat: {
    description: "钣金多段展开：给出各段直边长度与统一折弯参数，输出总展开长度",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        thickness: { type: "number", description: "板厚 mm" },
        angle: { type: "number", description: "每次折弯角度（度）" },
        radius: { type: "number", description: "内半径 mm" },
        k: { type: "number", description: "K 因子，默认 0.44" },
        legs: { type: "string", description: "直边长度列表，逗号分隔，如 30,50,20" },
      },
      required: ["thickness", "angle", "radius", "legs"],
    },
    run(args) {
      const parts = String(args.legs).split(",").map((x) => num(x.trim(), 0)).filter((x) => x > 0);
      if (parts.length < 2) throw new Error("至少需要两段直边");
      const r = bend(args.thickness, args.angle, args.radius, args.k);
      const sum = parts.reduce((a, b) => a + b, 0);
      const bends = parts.length - 1;
      const flat = sum - bends * r.bd;
      const lines = [
        "钣金多段展开",
        "=".repeat(48),
        "直边: " + parts.map(fmt).join(" + ") + " = " + fmt(sum) + " mm",
        "折弯数: " + bends,
        "单次 BD: " + fmt(r.bd) + " mm",
        "总展开长度: " + fmt(flat) + " mm",
        "",
        "更多工具：" + SITE,
      ];
      return lines.join(NL);
    },
  },
  sheetmetal_dfm: {
    description: "钣金 DFM 检查：孔到折弯距离、最小翻边、内半径与板厚比，给出通过与建议",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        thickness: { type: "number", description: "板厚 mm" },
        radius: { type: "number", description: "内半径 mm" },
        hole_distance: { type: "number", description: "孔边到折弯线距离 mm" },
        flange: { type: "number", description: "翻边高度 mm" },
      },
      required: ["thickness", "radius"],
    },
    run(args) {
      const T = num(args.thickness, 0);
      const R = num(args.radius, 0);
      if (T <= 0) throw new Error("厚度必须大于 0");
      const lines = ["钣金 DFM 检查", "=".repeat(48), "板厚 T: " + fmt(T) + " mm", "内半径 R: " + fmt(R) + " mm", ""];
      let pass = true;
      const rule = (name, ok, detail) => {
        if (!ok) pass = false;
        lines.push((ok ? "PASS " : "FAIL ") + name + " — " + detail);
      };
      rule("内半径 ≥ 板厚", R >= T, "R/T = " + fmt(R / T));
      if (args.hole_distance != null) {
        const need = 2.5 * T + R;
        rule("孔到折弯 ≥ 2.5T+R", num(args.hole_distance, 0) >= need, "需要 " + fmt(need) + " mm，实际 " + fmt(num(args.hole_distance, 0)) + " mm");
      }
      if (args.flange != null) {
        const need = 4 * T;
        rule("翻边高度 ≥ 4T", num(args.flange, 0) >= need, "需要 " + fmt(need) + " mm，实际 " + fmt(num(args.flange, 0)) + " mm");
      }
      lines.push("");
      lines.push(pass ? "结论：可制造（按给定规则）" : "结论：存在风险，建议调整后复检");
      lines.push("规则基于常见钣金经验值，量产前请以工厂 DFM 为准。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) {
        try {
          return { text: t.run(args || {}) };
        } catch (e) {
          return { text: "处理失败: " + String((e && e.message) || e) };
        }
      },
    });
  }
}
