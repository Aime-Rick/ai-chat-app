# AI Chat Application

A production-ready, full-stack AI chat application built with React, TypeScript, Node.js, and Supabase. Features real-time messaging, user authentication, conversation history, and AI-powered responses.

## 🚀 Features

### Core Functionality
- **Interactive Chat Interface**: Real-time messaging with typing indicators
- **AI Integration**: LLM API integration for intelligent responses
- **User Authentication**: Secure JWT-based authentication with Supabase
- **Conversation Management**: Create, view, and manage chat conversations
- **Message History**: Persistent storage of all conversations and messages
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Technical Features
- **Full-Stack Architecture**: React frontend with Node.js backend
- **TypeScript**: End-to-end type safety
- **Database**: PostgreSQL with Supabase for scalable data storage
- **Real-time Updates**: Live message synchronization
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance Optimized**: Lazy loading, code splitting, and caching
- **Security**: Row-level security (RLS) and input validation

### UI/UX Features
- **Modern Design**: Clean, professional interface with smooth animations
- **Dark/Light Theme**: Adaptive color scheme
- **Mobile-First**: Responsive design with mobile optimization
- **Accessibility**: WCAG compliance and keyboard navigation
- **Loading States**: User-friendly loading indicators and skeleton screens

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chat-application
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the database migrations from `/supabase/migrations`
   - Configure authentication settings (disable email confirmation for development)

4. **Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials and API keys:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_OPENAI_API_KEY=your-openai-api-key  # Optional for AI integration
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat-specific components
│   ├── layout/         # Layout components
│   └── ui/             # Generic UI components
├── lib/                # Utility libraries and configurations
├── pages/              # Page components
├── store/              # State management
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point

supabase/
├── functions/          # Edge functions for backend logic
└── migrations/         # Database schema migrations
```

### AI Integration
The application includes a OpenRouter AI service that can be easily replaced with:
- OpenAI GPT API
- Anthropic Claude API
- Google PaLM API
- Custom AI models

### Other Platforms
The application can also be deployed to:
- Vercel
- Netlify
- AWS Amplify
- Any static hosting service

## 🧪 Testing

Run the test suite:
```bash
npm run test          # Run tests
npm run test:ui       # Run tests with UI
```

## 🔒 Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries and ORM usage
- **XSS Prevention**: Proper content escaping and CSP headers
- **Authentication**: Secure JWT implementation
- **HTTPS**: Enforced secure connections
- **Rate Limiting**: API rate limiting to prevent abuse

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## 🗺 Roadmap

### Upcoming Features
- [ ] Voice messaging support
- [ ] File upload and sharing
- [ ] Multi-language support
- [ ] Advanced AI model selection
- [ ] Conversation export
- [ ] Team collaboration features
- [ ] Plugin system for extensions

### Performance Improvements
- [ ] Service worker implementation
- [ ] Advanced caching strategies
- [ ] Database query optimization
- [ ] Real-time performance monitoring
