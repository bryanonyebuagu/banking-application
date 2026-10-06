"use client";

import { useId, useState, type ReactNode } from "react";
import { classes } from "@/utils/classes";

export function Tabs({ label, items }: { label: string; items: Array<{ label: string; content: ReactNode }> }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  return <div><div role="tablist" aria-label={label} className="flex flex-wrap border-b border-border">{items.map((item, index) => <button key={item.label} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault(); setSelected(next); document.getElementById(`${id}-tab-${next}`)?.focus();
  }} className={classes("min-h-11 border-b-2 px-4 py-2 font-semibold", selected === index ? "border-action text-action" : "border-transparent text-muted")}>{item.label}</button>)}</div>{items.map((item, index) => <div key={item.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0} className="py-4">{item.content}</div>)}</div>;
}
