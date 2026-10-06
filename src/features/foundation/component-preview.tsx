"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select, Checkbox, Radio } from "@/components/ui/fields";
import { Card, Alert, EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/surfaces";
import { Modal, Drawer } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { Table, Pagination } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";

const previewSchema = z.object({ nickname: z.string().trim().min(2, "Enter at least 2 characters.").max(40, "Use no more than 40 characters.") });

export function ComponentPreview() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(false);
  const [result, setResult] = useState("");
  const [page, setPage] = useState(1);
  const form = useForm<z.infer<typeof previewSchema>>({ resolver: zodResolver(previewSchema), defaultValues: { nickname: "" } });
  return <div className="grid gap-6 lg:grid-cols-2"><Card><h2 className="mb-5 text-xl font-semibold">Forms and validation</h2><form noValidate onSubmit={form.handleSubmit((values) => setResult(`Preview accepted: ${values.nickname}. Nothing was saved.`))} className="space-y-5"><Input label="Example nickname" hint="Preview only. Use 2–40 characters." error={form.formState.errors.nickname?.message} required {...form.register("nickname")} /><Select label="Example account type" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option></Select><Checkbox label="Example preference" /><fieldset><legend className="font-semibold">Example display</legend><Radio label="Compact" name="display" value="compact" defaultChecked /><Radio label="Comfortable" name="display" value="comfortable" /></fieldset><Button type="submit">Validate preview</Button>{result && <Alert title="Validation complete">{result}</Alert>}</form></Card><Card><h2 className="mb-5 text-xl font-semibold">Actions and overlays</h2><div className="flex flex-wrap gap-3"><Button onClick={() => setModal(true)}>Open dialog</Button><Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button><Button variant="tertiary" onClick={() => setToast(true)}>Show notification</Button><Button disabled aria-describedby="unavailable-note">Unavailable</Button></div><p id="unavailable-note" className="mt-3 text-sm text-muted">Disabled example: available in a future phase.</p><div className="mt-6 space-y-4"><Alert title="Information">Persistent messages belong near the action.</Alert><Alert title="Success" tone="success">An example success state, not a banking operation.</Alert><ErrorState>An example error with a clear explanation.</ErrorState>{toast && <Toast message="Preview notification shown." onDismiss={() => setToast(false)} />}</div></Card><Card><h2 className="mb-5 text-xl font-semibold">Tabs and loading states</h2><Tabs label="Example states" items={[{ label: "Empty", content: <EmptyState title="No items yet">New activity will appear here.</EmptyState> }, { label: "Loading", content: <div className="space-y-4"><Spinner /><Skeleton /><Skeleton className="w-2/3" /></div> }]} /></Card><Card><h2 className="mb-5 text-xl font-semibold">Tables and pagination</h2><Table caption="Preview component inventory" headings={["Component", "Purpose"]}><tr><td className="border-t border-border px-4 py-3">{page === 1 ? "Button" : "Dialog"}</td><td className="border-t border-border px-4 py-3">{page === 1 ? "Accessible actions" : "Focused interaction"}</td></tr></Table><div className="mt-4"><Pagination page={page} totalPages={2} onChange={setPage} /></div></Card><Modal open={modal} onClose={() => setModal(false)} title="Example dialog"><p className="mb-6">Focus stays inside this dialog. Escape closes it and returns focus to the trigger.</p><Button onClick={() => setModal(false)}>Done</Button></Modal><Drawer open={drawer} onClose={() => setDrawer(false)} title="Example drawer"><p className="mb-6">A shared drawer for compact navigation and focused tasks.</p><Button onClick={() => setDrawer(false)}>Done</Button></Drawer></div>;
}
