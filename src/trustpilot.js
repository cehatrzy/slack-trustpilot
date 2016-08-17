"use strict";

const requestPromise = require("request-promise");

function autoParse(body, response) {
    if (response.headers["content-type"] && response.headers["content-type"].indexOf("application/json") === 0) {
        return JSON.parse(body);
    } else {
        return body;
    }
}

module.exports = function (config, tokenRequest) {
    const API_KEY = config.API_KEY;
    const API_SECRET = config.API_SECRET;
    const API_TOKEN = config.API_TOKEN;
    const API_HOST = config.API_HOST;
    const BUSINESS_USER_NAME = config.BUSINESS_USER_NAME;
    const BUSINESS_USER_PASS = config.BUSINESS_USER_PASS;
    const BUSINESS_UNIT_ID = config.BUSINESS_UNIT_ID;

    var baseRequest = requestPromise.defaults({
        baseUrl: API_HOST,
        transform: autoParse
    });

    var requestWithApiKey = baseRequest.defaults({
        headers: {
            "apikey": API_KEY
        }
    });

    var ApiBridge = (function () {
        var authorization;

        function isAuthValid() {
            if (!authorization) {
                return false;
            }
            var shouldExpireBy = parseInt(authorization.issued_at) + parseInt(authorization.expires_in);
            var now = new Date().getTime();

            if (now > (shouldExpireBy - 3600)) {
                return false;
            }

            return true;
        }

        function getFreshToken() {
            if (isAuthValid()) {
                return global.Promise.resolve(authorization);
            } else {
                return requestWithApiKey(tokenRequest).then(function (data) {
                    authorization = data;
                    return authorization;
                }).catch(function () {
                    console.error("Something went wrong when setting up access to the Trustpilot APIs. Please check your API key and secret.");
                });
            }
        }

        function privateRequest(options) {
            return getFreshToken().then(function (data) {
                options.auth = {
                    bearer: data.access_token
                };
                return requestWithApiKey(options);
            });
        }

        return {
            getLastUnansweredReview: function (stars, businessUnitId) {
                var params = {
                    orderBy: "createdat.desc",
                    responded: false
                };
                if (stars) {
                    params.stars = stars;
                }
                businessUnitId = businessUnitId || BUSINESS_UNIT_ID;
                return privateRequest({
                    method: "GET",
                    uri: `/v1/private/business-units/${businessUnitId}/reviews`,
                    qs: params
                });
            },

            replyToReview: function (reviewId, message) {
                return privateRequest({
                    method: "POST",
                    uri: `/v1/private/reviews/${reviewId}/reply`,
                    form: {
                        message: message
                    }
                });
            }
        };
    })();

    return ApiBridge;
};