import { readFileSync } from "fs";
import { resolve } from "path";
import { QuestionDefinition } from "./types";

const templater = require("templater.js");

export const basicPage = (title: string, body: string) => {
  return renderTemplate("basicPage", {
      title,
      body
  });
};

export const questions = (questionList: QuestionDefinition[]) => {
  const questionHtml: string[] = [];

  questionList
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(q => {
          questionHtml.push(question(q.id, q.label, q.options, q.defaultVal));
      });

  return `${questionHtml.join("")}`;
};

const question = (id: string, label: string, options: string[], defaultVal?: string) => {
  const optionHtml: string[] = [];

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

export const renderTemplate = (templateFile: string, data: any) => {
  const template = templater(getTemplate(templateFile));
  return template(data, { autoescape: false });
};

function getTemplate(templateFile: string): string {
  const templatePath = resolve(process.env.LAMBDA_TASK_ROOT || "", `./templates/${templateFile}.html`);
  return readFileSync(templatePath, 'utf8');
}