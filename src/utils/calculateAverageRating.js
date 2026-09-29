// calculateAverageRating() takes an array of numeric ratings and returns
// the average rounded to 1 decimal place, plus the count.
// What: pure function, no DB involved.
// Why: keeps the math testable on its own, separate from the Mongo aggregation query.
// Where: used by getProviderReviews (and could be reused anywhere provider rating is shown).
const calculateAverageRating = (ratings) => {
  if (!ratings.length) {
    return { averageRating: 0, totalReviews: 0 };
  }
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const averageRating = Math.round((sum / ratings.length) * 10) / 10;
  return { averageRating, totalReviews: ratings.length };
};

export default calculateAverageRating;
