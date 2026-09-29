// getPagination() reads ?page=&limit= from the query string and returns
// safe, bounded values plus the Mongo skip offset.
// What: shared page/limit/skip calculation.
// Why: this exact logic was copy-pasted in serviceController, bookingController,
//      and adminController — Phase 10 code-quality review flagged it as duplicate code.
// Where: any controller that lists paginated results.
const getPagination = (req = {}) => {
  const q = req?.query || req || {};
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || 10, 1), 50); // cap at 50/page
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};


// buildPaginationMeta() turns a total count into the { total, page, limit, totalPages }
// object every list endpoint returns in the same shape.
export const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

export default getPagination;
