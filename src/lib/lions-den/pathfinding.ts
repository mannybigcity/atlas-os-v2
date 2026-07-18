import type { NavigationEdge, NavigationNode } from "./types";

export function findShortestPath(
  nodes: NavigationNode[],
  edges: NavigationEdge[],
  startId: string,
  targetId: string,
) {
  if (startId === targetId) return [startId];

  const nodeIds = new Set(nodes.map((node) => node.id));
  if (!nodeIds.has(startId) || !nodeIds.has(targetId)) return [];

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);

  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      previous.set(next, current);

      if (next === targetId) {
        const path = [targetId];
        let cursor = targetId;
        while (previous.has(cursor)) {
          cursor = previous.get(cursor)!;
          path.unshift(cursor);
        }
        return path;
      }

      queue.push(next);
    }
  }

  return [];
}

export function pathToPolyline(
  path: string[],
  nodes: NavigationNode[],
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return path
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is NavigationNode => Boolean(node))
    .map((node) => `${node.x},${node.y}`)
    .join(" ");
}

export function interpolatePathPosition(
  path: string[],
  nodes: NavigationNode[],
  progress: number,
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const points = path
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is NavigationNode => Boolean(node));

  if (points.length === 0) return { x: 50, y: 50 };
  if (points.length === 1) return { x: points[0].x, y: points[0].y };

  const clamped = Math.min(Math.max(progress, 0), 1);
  const segmentProgress = clamped * (points.length - 1);
  const segmentIndex = Math.min(Math.floor(segmentProgress), points.length - 2);
  const localProgress = segmentProgress - segmentIndex;
  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];

  return {
    x: start.x + (end.x - start.x) * localProgress,
    y: start.y + (end.y - start.y) * localProgress,
  };
}
