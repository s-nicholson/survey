exports.basicPage = (title, body) => {
  return renderTemplate("basicPage", {
      title,
      body
  });
};

exports.questions = (questionList) => {
  const questionHtml = [];

  questionList
      .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0))
      .forEach(q => {
          questionHtml.push(question(q.id, q.label, q.options, q.defaultVal));
      });

  return `${questionHtml.join("")}`;
};

const question = (id, label, options, defaultVal) => {
  const optionHtml = [];

  if (!defaultVal) {
      defaultVal = options[0];
  }
  options.forEach(opt => {
      const selected = (opt == defaultVal) ? "selected" : "";
      optionHtml.push(`<option ${selected}>${opt}</option>`);
  });

  return renderTemplate("question", {
      id,
      label,
      options: optionHtml.join("")
  });
};

const templater = require("templater.js")
const renderTemplate = (templateFile, data) => {
  const template = templater(getTemplate(templateFile));
  return template(data, { autoescape: false });
}
exports.renderTemplate = renderTemplate;

const fs = require("fs");
const path = require("path");
function getTemplate(templateFile) {
  const templatePath = path.resolve(process.env.LAMBDA_TASK_ROOT, `./templates/${templateFile}.html`);
  return fs.readFileSync(templatePath, 'utf8');
}