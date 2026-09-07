export type AdminCategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  children: AdminCategoryTreeNode[];
};

export type FlatAdminCategory = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  depth: number;
};

export function flattenCategoryTree(
  nodes: AdminCategoryTreeNode[],
  depth = 0,
): FlatAdminCategory[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      position: node.position,
      isActive: node.isActive,
      productCount: node.productCount,
      depth,
    },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}

export function collectDescendantIds(categories: FlatAdminCategory[], id: string): Set<string> {
  const ids = new Set<string>();
  let frontier = [id];

  while (frontier.length > 0) {
    const next = categories
      .filter((category) => category.parentId && frontier.includes(category.parentId))
      .map((category) => category.id);
    next.forEach((childId) => ids.add(childId));
    frontier = next;
  }

  return ids;
}
