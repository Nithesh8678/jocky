import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function Button({className,variant='default',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'default'|'outline'|'ghost'}){return <button className={twMerge(clsx('button',variant,className))} {...props}/>}
