exports.validateParams = (params) => {
  if (!params || !params.surveyId || !params.pin) {
    throw new Error("Missing params");
  }

  return { id: params.surveyId, pin: params.pin };
};