const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    game: {
        type: String,
        enum: ['brawlstars', 'clash_royale'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['1vs1', 'bracket'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    completedAt: {
        type: Date,
    },
    maxParticipants: {
        type: Number,
        required: true
    },
    registrationFee: {
        type: Number,
        default: 0
    },
    rules: {
        type: String,
        required: true
    },
    prizes: {
        type: String,
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['registered', 'waiting', 'disqualified', 'expelled'],
            default: 'registered'
        },
        expelledReason: {
            type: String,
        },
        expelledAt: {
            type: Date,
        },
        expelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        joinDate: {
            type: Date,
            default: Date.now
        },
        paymentProof: {
            imageUrl: {
                type: String,
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            },
            uploadedAt: {
                type: Date,
            },
            verifiedAt: {
                type: Date,
            },
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            reported: {
                type: Boolean,
                default: false,
            },
            reportReason: {
                type: String,
            },
        }
    }],
    results: [{
        round: Number,
        playerA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        playerB: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: String
    }],
    pointsAwards: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            placement: Number,
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
            points: {
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
    pointsAwardedAt: {
        type: Date,
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Tournament', tournamentSchema);
