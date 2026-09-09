import { redirect } from "next/navigation";

export default function DigitalDocsSolutionsRedirect() {
  const url = process.env.DIGITAL_DOCS_SOLUTIONS_URL || "/login";
  redirect(url);
}
