module.exports = function (client) {

  async function privateRequest(options) {
    const requestWrapper = await client.authenticate();
    return requestWrapper(options);
  }

  class ApiBridge {

    async getLastUnansweredReview({
      stars,
      businessUnitId,
    }) {
      const data = await privateRequest({
        method: 'GET',
        uri: `/v1/private/business-units/${businessUnitId}/reviews`,
        qs: {
          orderBy: 'createdat.desc',
          responded: false,
          stars,
        },
      });
      return data.reviews.length > 0 ? data.reviews[0] : null;
    }

    replyToReview({
      reviewId,
      message,
    }) {
      return privateRequest({
        method: 'POST',
        uri: `/v1/private/reviews/${reviewId}/reply`,
        form: {
          message: message,
        },
      });
    }
  }

  return new ApiBridge();
};
