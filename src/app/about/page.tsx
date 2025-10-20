import React from 'react';
import AboutPage from '@/components/AboutPage';

// Mock data - in a real app, this would come from an API or CMS
const mockData = {
  setting: [
    {
      aboutSection: `
        <h2>Welcome to Finnep</h2>
        <p>We are passionate about connecting people through unforgettable experiences. Our platform brings together event organizers and attendees in a seamless, user-friendly environment.</p>
        
        <h3>Our Mission</h3>
        <p>To create meaningful connections through carefully curated events that bring communities together. We believe that shared experiences are the foundation of lasting relationships and vibrant communities.</p>
        
        <h3>What We Do</h3>
        <ul>
          <li>Curate high-quality events across various categories</li>
          <li>Provide a secure and easy-to-use ticketing platform</li>
          <li>Connect event organizers with their target audiences</li>
          <li>Ensure smooth event experiences for all participants</li>
        </ul>
        
        <p>Join us in creating memorable moments and building stronger communities, one event at a time.</p>
      `,
      contactInfo: {
        email: 'hello@finnep.com',
        phone: '+1 (555) 123-4567'
      },
      socialMedia: {
        facebook: 'https://facebook.com/finnep',
        twitter: 'https://twitter.com/finnep',
        instagram: 'https://instagram.com/finnep'
      },
      createdAt: '2023-01-15T00:00:00.000Z',
      partners: [
        // Add partner logo URLs here if you have them
        // '/images/partner1.png',
        // '/images/partner2.png'
      ]
    }
  ]
};

export default function About() {
  return <AboutPage data={mockData} />;
}
