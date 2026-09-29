// The booking workflow is a one-way state machine:
//
//   PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED
//      |           |
//      v           v
//   REJECTED    CANCELLED
//      |
//      v
//   CANCELLED
//
// COMPLETED, CANCELLED, and REJECTED are terminal — nothing can transition
// out of them (e.g. COMPLETED -> PENDING is never allowed).
//
// This map is used by the PATCH /:id/status endpoint (provider-driven
// transitions). Cancellation is handled separately by canCancel() below,
// since a customer cancelling isn't really "the next step" in the workflow.
export const STATUS_TRANSITIONS = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

// isValidStatusTransition() checks whether moving from one status to
// another is allowed by the workflow above.
export const isValidStatusTransition = (currentStatus, nextStatus) => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
};

// canCancel() checks whether a booking in the given status is still
// eligible for a customer-initiated cancellation. Once work has started
// (IN_PROGRESS) or the booking has already reached a terminal state,
// cancellation is no longer allowed.
export const canCancel = (currentStatus) => {
  return currentStatus === "PENDING" || currentStatus === "ACCEPTED";
};
