// map-server/backend/src/controllers/teamController.js

import Team from '../models/Team.js';
import User from '../models/User.js';
import PixelEvent from '../models/PixelEvent.js';
import mongoose from 'mongoose';
import { createNotificationBatch } from '../services/notificationService.js';

// Constants
const MAX_TEAM_SIZE = 50;
const MIN_TEAM_NAME_LENGTH = 3;
const MAX_TEAM_NAME_LENGTH = 30;

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 * @access  Private
 */
export const createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.session.userId;

    if (!name || name.trim().length < MIN_TEAM_NAME_LENGTH) {
      return res.status(400).json({ 
        message: `Team name must be at least ${MIN_TEAM_NAME_LENGTH} characters` 
      });
    }

    if (name.length > MAX_TEAM_NAME_LENGTH) {
      return res.status(400).json({ 
        message: `Team name must not exceed ${MAX_TEAM_NAME_LENGTH} characters` 
      });
    }

    const user = await User.findById(userId);
    if (user.teamId) {
      return res.status(400).json({ 
        message: 'You are already in a team. Please leave your current team first.' 
      });
    }

    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already exists' });
    }

    const team = await Team.create({
      name: name.trim(),
      createdBy: userId,
    });

    user.teamId = team._id;
    await user.save();

    res.status(201).json({
      message: 'Team created successfully',
      team: {
        _id: team._id,
        name: team.name,
        createdBy: team.createdBy,
        createdAt: team.createdAt,
        memberCount: 1,
        overlay: team.overlay // Return overlay info
      },
      user: {
        _id: user._id,
        username: user.username,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    console.error('createTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all teams with pagination
 * @route   GET /api/teams?page=1&limit=20
 * @access  Public
 */
export const getTeams = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;
  
      const teams = await Team.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name createdBy createdAt memberCount');
  
      const teamsWithStats = teams.map(team => ({
        _id: team._id,
        name: team.name,
        createdBy: team.createdBy,
        createdAt: team.createdAt,
        memberCount: team.memberCount || 0,
      }));
  
      const total = await Team.countDocuments();
  
      res.json({
        teams: teamsWithStats,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTeams: total,
      });
    } catch (error) {
      console.error('getTeams error:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Get team by ID with members
 * @route   GET /api/teams/:teamId
 * @access  Public
 */
export const getTeamById = async (req, res) => {
    try {
      const { teamId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
  
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      const members = await User.find({ teamId: team._id })
        .select('username createdAt')
        .sort({ createdAt: 1 });
  
      res.json({
        team: {
          _id: team._id,
          name: team.name,
          createdBy: team.createdBy,
          createdAt: team.createdAt,
          memberCount: members.length,
          overlay: team.overlay, // Return overlay info
          members: members.map(m => ({
            _id: m._id,
            username: m.username,
            joinedAt: m.createdAt,
            isCreator: m._id.toString() === team.createdBy.toString(),
          })),
        },
      });
    } catch (error) {
      console.error('getTeamById error:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update team (creator only)
 * @route   PUT /api/teams/:teamId
 * @access  Private (creator only)
 */
export const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, overlay } = req.body; // <--- SỬA: Lấy thêm overlay
    const userId = req.session.userId;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is creator
    if (team.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only team creator can update team' });
    }

    // Update Name
    if (name) {
      if (name.trim().length < MIN_TEAM_NAME_LENGTH || name.length > MAX_TEAM_NAME_LENGTH) {
        return res.status(400).json({ 
          message: `Team name must be between ${MIN_TEAM_NAME_LENGTH} and ${MAX_TEAM_NAME_LENGTH} characters` 
        });
      }

      const existingTeam = await Team.findOne({ 
        name: name.trim(), 
        _id: { $ne: teamId } 
      });
      if (existingTeam) {
        return res.status(400).json({ message: 'Team name already exists' });
      }

      team.name = name.trim();
    }

    // --- THÊM: Update Overlay ---
    if (overlay) {
      team.overlay = {
        ...team.overlay, // Giữ lại giá trị cũ
        ...overlay       // Đè giá trị mới
      };
    }
    // ----------------------------

    await team.save();

    res.json({
      message: 'Team updated successfully',
      team: {
        _id: team._id,
        name: team.name,
        createdBy: team.createdBy,
        updatedAt: team.updatedAt,
        overlay: team.overlay, // Trả về overlay mới
      },
    });
  } catch (error) {
    console.error('updateTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete team (creator only)
 * @route   DELETE /api/teams/:teamId
 * @access  Private (creator only)
 */
export const deleteTeam = async (req, res) => {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
  
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
  
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      // Check if user is creator
      if (team.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Only team creator can delete team' });
      }
  
      await User.updateMany({ teamId: team._id }, { $set: { teamId: null } });
      team.memberCount = 0;
      await team.save();
      await Team.deleteOne({ _id: team._id });
  
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('deleteTeam error:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Join a team
 * @route   POST /api/teams/:teamId/join
 * @access  Private
 */
export const joinTeam = async (req, res) => {
    try {
      const { teamId } = req.params;
      const userId = req.session.userId;
  
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
  
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      const user = await User.findById(userId);
  
      if (user.teamId && user.teamId.toString() === teamId) {
        return res.status(400).json({ message: 'You are already in this team' });
      }
  
      const memberCount = await User.countDocuments({ teamId: team._id });
      if (memberCount >= MAX_TEAM_SIZE) {
        return res.status(400).json({ 
          message: `Team is full (max ${MAX_TEAM_SIZE} members)` 
        });
      }
  
      if (user.teamId) {
        await Team.findByIdAndUpdate(user.teamId, { $inc: { memberCount: -1 } });
        user.teamId = null;
      }
  
      user.teamId = team._id;
      await user.save();
  
      team.memberCount += 1;
      await team.save();
  
      res.json({
        message: 'Successfully joined team',
        team: {
          _id: team._id,
          name: team.name,
          memberCount: team.memberCount,
          overlay: team.overlay
        },
        user: {
          _id: user._id,
          username: user.username,
          teamId: user.teamId,
        },
      });
    } catch (error) {
      console.error('joinTeam error:', error);
      res.status(500).json({ message: 'Server error' });
    }

    // Leave current team if in one
    if (user.teamId) {
      // Auto-leave current team and decrement its member count
      await Team.findByIdAndUpdate(user.teamId, { $inc: { memberCount: -1 } });
      user.teamId = null;
    }

    // Join new team
    user.teamId = team._id;
    await user.save();

    // Increment new team's member count
    team.memberCount += 1;
    await team.save();

    console.log(`User ${user.username} (${user._id}) joined team ${team.name} (${team._id})`);

    // Notify other team members about the new member
    try {
      const otherMembers = await User.find({ 
        teamId: team._id, 
        _id: { $ne: userId } 
      }).select('_id');

      if (otherMembers.length > 0) {
        const notifications = otherMembers.map(member => ({
          userId: member._id,
          type: 'team_member_joined',
          title: 'New Team Member',
          message: `${user.username} joined your team "${team.name}"`,
          data: {
            teamId: team._id,
            teamName: team.name,
            newMemberId: user._id,
            newMemberUsername: user.username,
          },
        }));

        await createNotificationBatch(notifications);
        console.log(`📨 Sent ${notifications.length} team_member_joined notifications`);
      }
    } catch (notifError) {
      console.warn('⚠️ Failed to send join notifications:', notifError.message);
    }

    res.json({
      message: 'Successfully joined team',
      team: {
        _id: team._id,
        name: team.name,
        memberCount: team.memberCount,
      },
      user: {
        _id: user._id,
        username: user.username,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    console.error('joinTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Leave current team
 * @route   POST /api/teams/leave
 * @access  Private
 */
export const leaveTeam = async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId);
  
      if (!user.teamId) {
        return res.status(400).json({ message: 'You are not in any team' });
      }
  
      const team = await Team.findById(user.teamId);
      
      return res.json({ 
        message: 'You left and deleted the team (as creator)' 
      });
    }

    // Regular member leaving - decrement team member count
    const teamName = team?.name;
    const teamIdForNotif = team?._id;

    if (team) {
      team.memberCount = Math.max(0, team.memberCount - 1);
      await team.save();
    }

    user.teamId = null;
    await user.save();

    // Notify remaining team members about the departure
    if (team) {
      try {
        const remainingMembers = await User.find({ 
          teamId: teamIdForNotif 
        }).select('_id');

        if (remainingMembers.length > 0) {
          const notifications = remainingMembers.map(member => ({
            userId: member._id,
            type: 'team_member_left',
            title: 'Team Member Left',
            message: `${user.username} left your team "${teamName}"`,
            data: {
              teamId: teamIdForNotif,
              teamName: teamName,
              leftMemberId: user._id,
              leftMemberUsername: user.username,
            },
          }));

          await createNotificationBatch(notifications);
          console.log(`📨 Sent ${notifications.length} team_member_left notifications`);
        }
      } catch (notifError) {
        console.warn('⚠️ Failed to send leave notifications:', notifError.message);
      }
    }

    res.json({ message: 'Successfully left team' });
  } catch (error) {
    console.error('leaveTeam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get team statistics
 * @route   GET /api/teams/:teamId/stats
 * @access  Public
 */
export const getTeamStats = async (req, res) => {
    try {
      const { teamId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
  
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      const memberCount = await User.countDocuments({ teamId: team._id });
      const totalPixels = await PixelEvent.countDocuments({ teamId: team._id });
  
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const pixelsToday = await PixelEvent.countDocuments({
        teamId: team._id,
        createdAt: { $gte: todayStart },
      });
  
      const weekStart = new Date();
      const day = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - day);
      weekStart.setHours(0, 0, 0, 0);
      const pixelsThisWeek = await PixelEvent.countDocuments({
        teamId: team._id,
        createdAt: { $gte: weekStart },
      });
  
      const topContributors = await PixelEvent.aggregate([
        { $match: { teamId: team._id } },
        { $group: { _id: '$userId', pixels: { $sum: 1 } } },
        { $sort: { pixels: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { username: '$user.username', pixels: 1, _id: 0 } },
      ]);
  
      res.json({
        stats: {
          _id: team._id,
          name: team.name,
          memberCount,
          totalPixels,
          pixelsToday,
          pixelsThisWeek,
          topContributors: topContributors.map(c => ({
            _id: c._id,
            username: c.username,
            pixelCount: c.pixels,
          })),
        },
      });
    } catch (error) {
      console.error('getTeamStats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Search teams by name
 * @route   GET /api/teams/search?q=name
 * @access  Public
 */
export const searchTeams = async (req, res) => {
    try {
      const { q } = req.query;
  
      if (!q || q.trim().length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
      }
  
      const teams = await Team.find({
        name: { $regex: q.trim(), $options: 'i' },
      })
        .limit(20)
        .select('name createdAt');
  
      const teamsWithStats = await Promise.all(
        teams.map(async (team) => {
          const memberCount = await User.countDocuments({ teamId: team._id });
          return {
            _id: team._id,
            name: team.name,
            createdAt: team.createdAt,
            memberCount,
          };
        })
      );
  
      res.json({ teams: teamsWithStats });
    } catch (error) {
      console.error('searchTeams error:', error);
      res.status(500).json({ message: 'Server error' });
    }
};
