// ═══════════════════════════════════════════
// @yunwu/ui — Platform OS Unified Design System
// WO-P4C: Single source of UI truth
// ═══════════════════════════════════════════

export { cn } from "./utils";

// Design tokens
export { colors, spacing, radius, shadow, zIndex, typography, motion, sidebar } from "./tokens";

// Core components
export { Button } from "./components/button";
export { Card, StatCard, EmptyState, LoadingState } from "./components/card";
export { PermissionDenied, ErrorState } from "./components/feedback";
export { DataTable } from "./components/data-table";
export type { Column, DataTableProps } from "./components/data-table";
export { TableSkeleton, CardSkeleton, Skeleton, PageLoader, SubmitButton } from "./components/shared-states";

// Permission boundary
export { default as PermissionBoundary, PermissionProvider, usePermission, AnyPermission, AllPermissions } from "./permission-boundary";
