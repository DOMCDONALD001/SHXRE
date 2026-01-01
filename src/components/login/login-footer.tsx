import cn from 'clsx';

import type { JSX } from 'react';

const footerLinks = [
  ['About', '#'],
  ['Help Center', '#'],
  ['Privacy Policy', '#'],
  ['Cookie Policy', '#'],
  ['Accessibility', '#'],
  ['Ads Info', '#'],
  ['Blog', '#'],
  ['Status', '#'],
  ['Careers', '#'],
  ['Brand Resources', '#'],
  ['Advertising', '#'],
  ['Marketing', '#'],
  ['SHXRE for Business', '#'],
  ['Developers', '#'],
  ['Directory', '#'],
  ['Settings', '#']
] as const;

export function LoginFooter({
  containerClassName,
  linkClassName,
  copyClassName,
  hideLinks
}: {
  linkClassName?: string;
  containerClassName?: string;
  copyClassName?: string;
  hideLinks?: boolean;
}): JSX.Element {
  return (
    <footer
      className={cn(
        containerClassName ??
          'hidden flex-col justify-center p-4 text-sm text-light-secondary dark:text-dark-secondary lg:flex'
      )}
    >
      {!hideLinks && (
        <nav className='flex flex-wrap justify-center gap-4 gap-y-2'>
          {footerLinks.map(([linkName, href]) => (
            <a
              className={cn(linkClassName ?? 'custom-underline')}
              target='_blank'
              rel='noreferrer'
              href={href}
              key={linkName}
            >
              {linkName}
            </a>
          ))}{' '}
        </nav>
      )}
      <p className='flex justify-center gap-4'>
        <span className={cn(copyClassName ?? '')}>© 2024-2025 SHXRE</span>
      </p>
    </footer>
  );
}
