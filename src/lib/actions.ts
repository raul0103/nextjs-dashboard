"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchCreateInvoice } from "./data";
import { fetchUpdateInvoice } from "./data";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const InvoiceFields = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = InvoiceFields.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const date: string = new Date().toISOString().split("T")[0];

  fetchCreateInvoice(customerId, amount, status, date);

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = InvoiceFields.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  fetchUpdateInvoice(customerId, amount, status, id);

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
