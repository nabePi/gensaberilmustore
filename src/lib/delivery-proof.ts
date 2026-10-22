export type DeliveryProof = {
  photoUrl: string | null;
  receiverName: string | null;
  receiverRelation: string | null;
  confirmedAt: string | null;
};

/** Photos remain hosted by JNE; never fetch provider URLs from the server. */
export function safeDeliveryPhotoUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function getOrderDeliveryProof(order: {
  deliveryPhotoUrl?: string | null;
  deliveryReceiverName?: string | null;
  deliveryReceiverRelation?: string | null;
  deliveryConfirmedAt?: Date | null;
}): DeliveryProof | null {
  const proof = {
    photoUrl: safeDeliveryPhotoUrl(order.deliveryPhotoUrl),
    receiverName: order.deliveryReceiverName ?? null,
    receiverRelation: order.deliveryReceiverRelation ?? null,
    confirmedAt: order.deliveryConfirmedAt?.toISOString() ?? null,
  };
  return Object.values(proof).some(Boolean) ? proof : null;
}
