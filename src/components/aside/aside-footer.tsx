import type { JSX } from 'react';
const footerLinks = [
  ['Terms of Service', '#'],
  ['Privacy Policy', '#'],
  ['Cookie Policy', '#'],
  ['Accessibility', '#'],
  ['Ads Info', '#']
] as const;

export function AsideFooter(): JSX.Element {
  return (
    <footer
      className='sticky top-16 flex flex-col gap-3 text-center text-sm 
                 text-light-secondary dark:text-dark-secondary'
    >
      <nav className='flex flex-wrap justify-center gap-2'>
        {footerLinks.map(([linkName, href]) => (
          <a
            className='custom-underline'
            target='_blank'
            rel='noreferrer'
            href={href}
            key={linkName}
          >
            {linkName}
          </a>
        ))}
      </nav>
      <p>
        <span>© 2024-2025 SHXRE</span>
      </p>
    </footer>
  );
}
