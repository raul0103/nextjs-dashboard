import Form from "@/src/ui/invoices/edit-form";
import Breadcrumbs from "@/src/ui/invoices/breadcrumbs";
import { fetchInvoiceById, fetchCustomers } from "@/src/lib/data";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          {
            label: "Create Invoice",
            href: "/dashboard/invoices/create",
            active: true,
          },
        ]}
      />
      <Form customers={customers} invoice={invoice} />
    </main>
  );
}
