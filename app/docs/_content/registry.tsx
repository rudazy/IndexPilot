import type { ComponentType } from "react";
import type { DocSlug } from "../_lib/nav";
import GettingStarted from "./getting-started";
import DriftDetection from "./drift-detection";
import SetupGuide from "./setup-guide";
import RebalancePlan from "./rebalance-plan";
import ExecutingOnSoDEX from "./executing-on-sodex";
import FAQ from "./faq";

export const CONTENT_REGISTRY: Record<DocSlug, ComponentType> = {
  "getting-started": GettingStarted,
  "drift-detection": DriftDetection,
  "setup-guide": SetupGuide,
  "rebalance-plan": RebalancePlan,
  "executing-on-sodex": ExecutingOnSoDEX,
  faq: FAQ,
};
