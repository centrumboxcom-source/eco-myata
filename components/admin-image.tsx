"use client";
import Image from "next/image";
type Props = {
  value: string;
  label: string;
  demo: boolean;
  disabled: boolean;
  onChange: (url: string) => void;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string) => void;
};
export default function AdminImage({
  value,
  label,
  demo,
  disabled,
  onChange,
  onBusy,
  onMessage,
}: Props) {
  return (
    <label className="field full-width">
      {label}
      <input
        type="file"
        disabled={disabled}
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (demo) {
            onMessage(
              "Завантаження фото потребує підключення Supabase Storage.",
            );
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            onMessage("Оберіть зображення до 5 МБ.");
            return;
          }
          onBusy(true);
          onMessage("");
          try {
            const form = new FormData();
            form.set("file", file);
            const r = await fetch("/api/admin/upload", {
              method: "POST",
              body: form,
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.message);
            onChange(d.url);
          } catch (e) {
            onMessage((e as Error).message);
          } finally {
            onBusy(false);
            e.target.value = "";
          }
        }}
      />
      {value && (
        <Image
          src={value}
          alt={label}
          width={100}
          height={100}
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      )}
      <small>JPG, PNG або WebP до 5 МБ</small>
    </label>
  );
}
