import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-gradient-to-b from-white to-primary/10">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Top Footer - Logo and Info */}
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Logo and Tagline */}
          <div className="md:col-span-1">
            <div className="mb-2">
              <h4 className="text-lg font-semibold text-primary">Social Media</h4>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://www.instagram.com/dunamiseurope" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <span className="text-slate-600">Instagram</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://www.youtube.com/watch?v=jU6YIBKp3Wg&list=PLFgexMhoSyJylhZjifRnXHK94BtyXGuSY" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42c-.29-1.08-1.14-1.92-2.22-2.22C19.5 4 12 4 12 4s-7.5 0-8.32.2c-1.08.3-1.93 1.14-2.22 2.22C1 7.5 1 12 1 12s0 4.5.46 5.58c.29 1.08 1.14 1.92 2.22 2.22C4.5 20 12 20 12 20s7.5 0 8.32-.2c1.08-.3 1.93-1.14 2.22-2.22C23 16.5 23 12 23 12s0-4.5-.46-5.58z"></path><polygon points="9.54 15.54 9.54 8.46 15.36 12"></polygon></svg>
              </a>
              <span className="text-slate-600">YouTube</span>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold text-primary mb-4">Program</h4>
            <ul className="space-y-2">
              <li><Link href="/greenhouse" className="text-slate-600 hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/faq" className="text-slate-600 hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold text-primary mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <a href="mailto:info@dunamisgreenhouse.org" className="text-slate-600 hover:text-primary transition-colors">gheurope@idunamis.org</a>
              </li>
            </ul>
          </div>
          
          {/* Location */}
          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold text-primary mb-4">Location</h4>
            <p className="text-slate-600">Rua do Centro Cultural, 11,<br/>1700-036 Lisboa,<br/>Portugal</p>
            <a 
              href="https://maps.google.com/?q=Via+SS+113+Settentrionale+Sicula,+90047+Partinico+PA,+Italy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline mt-2"
            >
              <span>View on map</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
        
        {/* Bottom Footer - Copyright */}
        <div className="pt-8 border-t border-primary/10 text-sm text-slate-500 flex flex-col md:flex-row justify-between bg-gradient-to-r from-transparent via-primary/5 to-transparent">
          <div>
            <p>© 2025 Dunamis Greenhouse. All rights reserved.</p>
          </div>

        </div>
      </div>
    </footer>
  );
} 