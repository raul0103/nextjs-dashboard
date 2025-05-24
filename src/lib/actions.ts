"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "./data";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const InvoiceFields = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
  fields: {
    customerId: string;
    amount: number;
    status: string;
  };
};

export async function createInvoice(prevState: State, formData: FormData) {
  const formDataFields = {
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  };
  const validatedFields = InvoiceFields.safeParse(formDataFields);

  const new_state = {
    errors: {},
    message: "",
    fields: formDataFields,
  };

  if (!validatedFields.success) {
    new_state.errors = validatedFields.error.flatten().fieldErrors;
    new_state.message = "Missing Fields. Failed to Create Invoice.";
    return new_state;
  }
  const { customerId, amount, status } = validatedFields.data;
  try {
    const date: string = new Date().toISOString().split("T")[0];
    await query(
      "INSERT INTO invoices (customer_id, amount, status, date) VALUES (?, ?, ?, ?)",
      [customerId, amount, status, date]
    );
  } catch (error) {
    new_state.message = "Database Error: Failed to Create Invoice.";
    console.error(error);
    return new_state;
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const formDataFields = {
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  };
  const validatedFields = InvoiceFields.safeParse(formDataFields);

  const new_state = {
    errors: {},
    message: "",
    fields: formDataFields,
  };

  if (!validatedFields.success) {
    new_state.errors = validatedFields.error.flatten().fieldErrors;
    new_state.message = "Missing Fields. Failed to Create Invoice.";
    return new_state;
  }

  const { customerId, amount, status } = validatedFields.data;

  await query(
    "UPDATE invoices SET customer_id = ?, amount = ?, status = ? WHERE id = ?",
    [customerId, amount, status, id]
  );
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(
  prevState: boolean | null,
  formData: FormData
): Promise<boolean> {
  const id = formData.get("id");

  await query("DELETE FROM invoices WHERE id = ?", [id]);

  revalidatePath("/dashboard/invoices");

  return true;
}
