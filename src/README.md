# 💬 Chat App

A modern chat application built with React, TypeScript, and Tailwind CSS, designed for connecting users with female customer service representatives.

## ✨ Features

- **New Match Page**: Browse and discover new chat partners
- **Messages**: Manage conversations and chat history  
- **Shop**: Purchase star credits for premium features
- **Real-time Chat**: Interactive messaging interface
- **Mobile-First Design**: Optimized for mobile devices
- **Star-based Currency**: Yellow star ⭐ payment system

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **UI Components**: Radix UI + ShadCN
- **Build Tool**: Vite
- **Deployment**: Ready for Vercel, Netlify, and more

## 🚀 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Build for production:**
```bash
npm run build
```

## 📁 Project Structure

```
├── App.tsx                 # Main application component
├── components/             # React components
│   ├── NewGirls.tsx       # New matches page
│   ├── Messages.tsx       # Chat messages list
│   ├── Profile.tsx        # Shop/profile page
│   ├── ChatScreen.tsx     # Individual chat interface
│   └── ui/                # ShadCN UI components
├── styles/
│   └── globals.css        # Global styles and Tailwind config
└── package.json           # Dependencies and scripts
```

## 🎨 Key Features

### New Match System
- Browse female customer service representatives
- Free for first 2 matches
- Premium matches require star credits (2500 ⭐)

### Star Currency System
- 7 different purchase packages
- Clear message-to-star ratio
- 3D star-themed package icons

### Chat Interface
- Real-time messaging simulation
- Online status indicators
- Mobile-optimized UI

## 🌐 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

**Quick Deploy Options:**
- **Vercel**: `npx vercel`
- **Netlify**: Drag & drop `dist` folder
- **GitHub Pages**: `npm run deploy`

## 📱 Mobile Optimization

- 1.2x UI scaling for better touch experience
- Responsive design across all screen sizes
- Touch-friendly interaction patterns

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
VITE_API_URL=your-api-endpoint
VITE_APP_NAME=Chat App
```

### Customization
- Colors: Edit CSS variables in `styles/globals.css`
- Components: Modify components in `components/` directory
- Styling: Update Tailwind classes throughout

## 📄 License

This project is private and proprietary.

## 🆘 Support

For deployment issues or questions, check:
1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
2. Build logs for error details
3. Platform-specific documentation

---

**Ready to deploy? Follow the [deployment guide](./DEPLOYMENT.md) to get started! 🚀**