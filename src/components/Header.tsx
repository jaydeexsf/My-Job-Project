"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
// import { Menu } from "lucide-react";

const navigation = [
  { name: "Voice Search", href: "/" },
  { name: "Identify", href: "/identify" },
  { name: "Bookmarks", href: "/bookmarks" },
  { name: "Recite", href: "/recite" },
  { name: "History", href: "/history" },
];

export default function Header() {
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/20 dark:border-gray-700/20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo */}
					<Link href="/" className="flex items-center space-x-3">
						<div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
							<span className="text-white font-bold text-lg">Q</span>
						</div>
						<div>
							<h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
								QuranVoice
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400">Voice Search & Learning</p>
						</div>
					</Link>

					{/* Navigation */}
					<nav className="hidden md:flex space-x-1">
						{navigation.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								onClick={() => console.log('Button clicked: Navigation to', item.name, item.href)}
								className={clsx(
									"px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
									pathname === item.href
										? "bg-emerald-600 text-white shadow-md"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
								)}
							>
								{item.name}
							</Link>
						))}
					</nav>

					{/* Mobile menu button */}
					<div className="md:hidden">
						<button 
							onClick={() => {
								console.log('Button clicked: Mobile menu toggle');
								setMobileMenuOpen(!mobileMenuOpen);
							}}
							className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
						</button>
					</div>
				</div>

				{/* Mobile menu */}
				{mobileMenuOpen && (
					<div className="md:hidden border-t border-gray-200/20 dark:border-gray-700/20">
						<div className="px-2 pt-2 pb-3 space-y-1">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									onClick={() => {
										console.log('Button clicked: Mobile navigation to', item.name, item.href);
										setMobileMenuOpen(false);
									}}
									className={clsx(
										"block px-3 py-2 rounded-md text-base font-medium transition-colors",
										pathname === item.href
											? "bg-emerald-600 text-white"
											: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
									)}
								>
									{item.name}
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</header>
	);
}
