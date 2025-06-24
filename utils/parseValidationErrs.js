const parseValidationErrors = (req, e) => {
  const keys = Object.keys(e.errors);
  return keys.map((key) => key + ": " + e.errors[key].properties.message);
};

module.exports = parseValidationErrors;
