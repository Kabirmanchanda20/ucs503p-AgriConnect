import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline-light';
}) {
  const styles = {
    primary:
      'bg-leaf text-paper hover:bg-forest disabled:bg-soil/40',
    secondary:
      'bg-paper text-forest border border-forest/20 hover:border-forest/50',
    ghost: 'bg-transparent text-forest hover:bg-forest/8',
    danger: 'bg-clay text-paper hover:bg-clay/90',
    // Forest on harvest gold — do not pair harvest with text-soil (fails contrast).
    gold: 'bg-harvest text-forest hover:bg-[#c49212] disabled:bg-soil/40',
    'outline-light':
      'border border-paper/55 bg-transparent text-paper hover:border-paper hover:bg-paper/10',
  }[variant];

  return (
    <button
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed',
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-forest">{label}</span>
      {children}
      {error ? <span className="text-sm text-clay">{error}</span> : null}
    </label>
  );
}

const inputClass =
  'min-h-12 w-full rounded-xl border border-forest/15 bg-paper px-4 text-base text-ink outline-none ring-harvest/40 focus:border-leaf focus:ring-2';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputClass, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(inputClass, 'min-h-28 py-3', props.className)}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-forest/10 bg-paper p-5 shadow-[0_8px_30px_rgba(31,61,43,0.06)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'gold';
}) {
  const tones = {
    neutral: 'bg-forest/8 text-forest',
    good: 'bg-leaf/15 text-forest',
    warn: 'bg-harvest/20 text-soil',
    bad: 'bg-clay/15 text-clay',
    gold: 'bg-harvest/25 text-soil',
  }[tone];
  return (
    <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide', tones)}>
      {children}
    </span>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-clay/30 bg-clay/8 px-4 py-3 text-sm text-clay">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <h2 className="font-display text-2xl text-forest">{title}</h2>
      <p className="mt-2 text-ink/70">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function Spinner() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest/15 border-t-leaf" />
    </div>
  );
}
