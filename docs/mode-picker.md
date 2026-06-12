# CrewUp 模式选择器

中文 | [English](./mode-picker.en.md)

CrewUp 不会在用户没有选择模式时，根据关键词猜测正式 run 应该走哪种模式。

如果一个命令会创建真实 run，但没有包含 `--mode` 或 `--profile`，CrewUp 会输出模式选择卡，然后退出，不创建 run。

## 为什么

自然语言很容易含糊。同一句话里可能同时提到计划、实现、风险和想法。如果 harness 自己猜错模式，run 的含义就会变乱：

- 用户想实现，结果创建了只规划的 run。
- 用户想规划，结果代码被修改。
- 一个小修复被误判成完整 strict 工作流。

模式选择器的作用是：在 run 存在之前，先让用户确认这次 run 的契约。

## 模式

| 选项 | 模式 | 适合 | 是否会改代码 |
| --- | --- | --- | --- |
| A | `plan` | 只要规划、架构、验收标准或路线图。 | 否 |
| B | `lite-v2` | 小范围实现、单个 bugfix、单个 UI/copy 改动、或计划里的一个小阶段。 | 是 |
| C | `strict` | 较大功能、跨模块改动、需要 tester/reviewer/release 证据的完整交付。 | 是 |

## run 行为

这个命令不会创建 run：

```bash
npx crewup run "做一个评论系统"
```

它会输出三个可复制命令：

```bash
npx crewup run --mode=plan "做一个评论系统"
npx crewup run --mode=lite "做一个评论系统"
npx crewup run --mode=strict "做一个评论系统"
```

这些命令会立即创建 run：

```bash
npx crewup run --mode=plan "规划评论系统，不写代码"
npx crewup run --mode=lite "修复登录按钮文案"
npx crewup run --mode=strict "实现评论系统"
```

## continue 行为

这个命令不会创建 continuation run：

```bash
npx crewup continue <run-id> "继续实现"
```

它会输出 continuation 选择卡，让用户选择：

```bash
npx crewup continue <run-id> --mode=plan "继续实现"
npx crewup continue <run-id> --mode=lite "继续实现"
npx crewup continue <run-id> --mode=strict "继续实现"
```

如果来源 run 是 `plan` run，选择卡会解释如何使用已批准计划：

- 选 `plan`：只继续细化计划。
- 选 `lite-v2`：只实现一个小阶段。
- 选 `strict`：按完整计划交付。

## 推荐说法

已经知道模式时：

```text
使用 CrewUp plan，只规划这个功能，不改代码。
使用 CrewUp lite，修复这个小运行时 bug，并完成必要验证。
使用 CrewUp strict，完整实现这个功能并跑完整交付流程。
```

从 plan run 继续时：

```text
继续这个 plan run，使用 CrewUp strict，完整实现计划。
继续这个 plan run，使用 CrewUp lite，只实现第一阶段。
```

## 产品规则

没有显式 mode，就不创建正式 run。

AI 可以推荐模式，但最终由用户选择模式。
