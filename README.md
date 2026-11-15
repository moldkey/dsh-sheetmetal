[![DSHIO/T 10](https://dshio.org/badge/std.svg)](https://dshio.org/10/) [![deepseekbase](https://deepseekbase.com/badge/dsh-sheetmetal.svg)](https://deepseekbase.com/plugins/dsh-sheetmetal/)
<p align="center"><strong>dsh-sheetmetal — 钣金展开与 DFM</strong></p>

折弯补偿、折弯扣除、多段展开、可制造性检查。输入板厚/角度/半径即可算，不依赖任何外部服务。

## 安装

    dsh plugin --profile web add dsh-sheetmetal

    dsh plugin --profile web add github:moldkey/dsh-sheetmetal

## 三个工具

- `sheetmetal_bend`：单折弯 BA/BD/展开长度
- `sheetmetal_flat`：多段直边总展开
- `sheetmetal_dfm`：孔距、翻边、半径/板厚比检查

## 示例

板厚 2mm、90°、内半径 1mm、K=0.44：

    BA = 1.5708 × (1 + 0.44×2) = 2.953 mm
    BD = 2×(1+2)×tan(45°) − 2.953 = 3.047 mm

## 公式

    BA = θ(rad) × (R + K·T)
    BD = 2(R+T)tan(θ/2) − BA

## 说明

DFM 规则为常见经验值（孔距 ≥ 2.5T+R、翻边 ≥ 4T、R ≥ T），量产前以工厂 DFM 为准。

## 更多

- 全部工具：https://deepseekbase.com/zh/tools/

## 许可

MIT
