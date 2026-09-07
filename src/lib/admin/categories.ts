import type { AdminCategoryOption } from '@/components/admin/ProductForm';

export type CategoryNode = { id: string; name: string; children: CategoryNode[] };

export function flattenCategories(nodes: CategoryNode[], depth = 0): AdminCategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenCategories(node.children, depth + 1),
  ]);
}
