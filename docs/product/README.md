# 产品文档区说明

`docs/product/` 是产品长期沉淀区，不是正式需求的规划草稿区。

正式需求的需求细化、设计方案、实施路线、测试报告、评审报告和发布摘要，应先写入：

```text
.harness/runs/<run-id>/artifacts/
```

只有以下情况才更新本目录：

- 用户明确要求维护产品总设计、路线图或说明文档。
- run 已完成测试、评审和 release，且用户确认可以沉淀。
- 主 agent 使用 `harness:product-sync` 从 run artifacts 同步摘要。
