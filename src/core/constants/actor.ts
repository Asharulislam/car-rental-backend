// Who a token belongs to. Lives only in the token — not in the database or any response.
export const Actor = {
  admin: "admin",
  customer: "customer",
} as const;

export type Actor = (typeof Actor)[keyof typeof Actor];

export function isActor(value: unknown): value is Actor {
  return Object.values(Actor).includes(value as Actor);
}
