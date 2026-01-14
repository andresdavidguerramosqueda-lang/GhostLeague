const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CLAN_ROLES, normalizeClanRole } = require('./ClanMembership');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    playerId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    showEmailOnProfile: {
        type: Boolean,
        default: true,
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerifiedAt: {
        type: Date
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'creator', 'admin', 'owner', 'suspended', 'banned'],
        default: 'user'
    },
    suspended: {
        type: Boolean,
        default: false
    },
    banned: {
        type: Boolean,
        default: false
    },
    suspensionReason: {
        type: String,
        trim: true,
    },
    suspensionDate: {
        type: Date,
    },
    suspensionDurationDays: {
        type: Number,
        default: 7,
    },
    banReason: {
        type: String,
        trim: true,
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
    },
    banner: {
        type: String,
    },
    country: {
        type: String,
        trim: true,
    },
    favoriteGame: {
        type: String,
        trim: true,
    },
    bio: {
        type: String,
        trim: true,
    },
    socialSpotify: {
        type: String,
        trim: true,
    },
    socialTiktok: {
        type: String,
        trim: true,
    },
    socialTwitch: {
        type: String,
        trim: true,
    },
    socialDiscord: {
        type: String,
        trim: true,
    },
    socialInstagram: {
        type: String,
        trim: true,
    },
    socialX: {
        type: String,
        trim: true,
    },
    socialYoutube: {
        type: String,
        trim: true,
    },
    clanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clan',
        default: null
    },
    clanHistory: [{
        clan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clan'
        },
        role: {
            type: String,
            enum: Object.values(CLAN_ROLES)
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: {
            type: Date
        }
    }],
    competitive: {
        points: {
            type: Number,
            default: 0,
            min: 0
        },
        level: {
            type: Number,
            default: 1,
            min: 1
        },
        wins: {
            type: Number,
            default: 0,
        },
        losses: {
            type: Number,
            default: 0,
        },
        tournamentsPlayed: {
            type: Number,
            default: 0,
        },
        lastCompetitiveAt: {
            type: Date,
        },
        decayTotal: {
            type: Number,
            default: 0,
        },
        history: [
            {
                tournament: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Tournament',
                },
                tournamentName: {
                    type: String,
                    trim: true,
                },
                game: {
                    type: String,
                    trim: true,
                },
                completedAt: {
                    type: Date,
                },
                placement: {
                    type: Number,
                },
                points: {
                    type: Number,
                    default: 0,
                },
                wins: {
                    type: Number,
                    default: 0,
                },
                losses: {
                    type: Number,
                    default: 0,
                },
                difficultyAvg: {
                    type: Number,
                    default: 0,
                },
                breakdown: {
                    basePlacement: {
                        type: Number,
                        default: 0,
                    },
                    winsPoints: {
                        type: Number,
                        default: 0,
                    },
                    difficultyPoints: {
                        type: Number,
                        default: 0,
                    },
                    penalties: {
                        type: Number,
                        default: 0,
                    },
                    decay: {
                        type: Number,
                        default: 0,
                    },
                    total: {
                        type: Number,
                        default: 0,
                    },
                },
            },
        ],
        highlightedWins: [
            {
                tournament: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Tournament',
                },
                tournamentName: {
                    type: String,
                    trim: true,
                },
                game: {
                    type: String,
                    trim: true,
                },
                opponent: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                opponentUsername: {
                    type: String,
                    trim: true,
                },
                opponentLevel: {
                    type: Number,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('validate', function(next) {
    if (Array.isArray(this.clanHistory)) {
        for (const entry of this.clanHistory) {
            if (entry && entry.role) {
                entry.role = normalizeClanRole(entry.role);
            }
        }
    }
    next();
});

// Generate playerId before saving
userSchema.pre('save', async function(next) {
    // Generate playerId if it doesn't exist
    if (!this.playerId) {
        let playerId;
        let isUnique = false;
        
        while (!isUnique) {
            // Generate 7 character alphanumeric string
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '#';
            for (let i = 0; i < 7; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            playerId = result;
            
            // Check if playerId is unique
            const existingUser = await this.constructor.findOne({ playerId });
            if (!existingUser) {
                isUnique = true;
            }
        }
        
        this.playerId = playerId;
    }
    
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
