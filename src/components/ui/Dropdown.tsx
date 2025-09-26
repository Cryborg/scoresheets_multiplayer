'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  children: ReactNode;
  className?: string;
}

export default function Dropdown({ isOpen, anchorEl, children, className = '' }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen && anchorEl) {
      // Mise à jour directe et immédiate de la position
      const updatePosition = () => {
        const rect = anchorEl.getBoundingClientRect();
        
        // Éviter les mises à jour inutiles si la position n'a pas changé
        if (
          lastRectRef.current &&
          lastRectRef.current.top === rect.top &&
          lastRectRef.current.left === rect.left &&
          lastRectRef.current.width === rect.width
        ) {
          return;
        }
        
        lastRectRef.current = rect;
        
        // Mise à jour directe du DOM pour une meilleure performance
        if (dropdownRef.current) {
          dropdownRef.current.style.transform = `translate3d(${rect.left}px, ${rect.bottom}px, 0)`;
          dropdownRef.current.style.width = `${rect.width}px`;
        }
      };

      updatePosition();
      
      // Utiliser l'Intersection Observer pour une meilleure performance
      let scrollTimer: NodeJS.Timeout;
      const handleScroll = () => {
        updatePosition();
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(updatePosition, 10);
      };

      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
        clearTimeout(scrollTimer);
      };
    }
  }, [isOpen, anchorEl]);

  if (!isOpen || !anchorEl) return null;

  // Position initiale pour éviter le flash
  const initialRect = anchorEl.getBoundingClientRect();
  
  return createPortal(
    <div
      ref={dropdownRef}
      className={`fixed top-0 left-0 z-[100] ${className}`}
      style={{
        transform: `translate3d(${initialRect.left}px, ${initialRect.bottom}px, 0)`,
        width: `${initialRect.width}px`,
        maxHeight: `calc(100vh - ${initialRect.bottom}px - 20px)`,
        willChange: 'transform',
        transition: 'none'
      }}
    >
      {children}
    </div>,
    document.body
  );
}