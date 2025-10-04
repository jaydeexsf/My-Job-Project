import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getMongoUri } from '@/lib/db';
import { BookmarkModel, RecitationHistoryModel } from '@/lib/models';

export async function POST(request: NextRequest) {
	try {
		const { action } = await request.json();
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}

		switch (action) {
			case 'clear':
				// Clear all data
				const bookmarkDeleteResult = await BookmarkModel.deleteMany({});
				const recitationDeleteResult = await RecitationHistoryModel.deleteMany({});
				
				return NextResponse.json({
					success: true,
					message: 'Database cleared successfully',
					data: {
						deletedBookmarks: bookmarkDeleteResult.deletedCount,
						deletedRecitations: recitationDeleteResult.deletedCount
					}
				});

			case 'stats':
				// Get database statistics
				const bookmarkCount = await BookmarkModel.countDocuments();
				const recitationCount = await RecitationHistoryModel.countDocuments();
				
				const recentBookmarks = await BookmarkModel.find()
					.sort({ createdAt: -1 })
					.limit(5)
					.lean();
				
				const recentRecitations = await RecitationHistoryModel.find()
					.sort({ createdAt: -1 })
					.limit(5)
					.lean();
				
				return NextResponse.json({
					success: true,
					data: {
						counts: {
							bookmarks: bookmarkCount,
							recitations: recitationCount
						},
						recent: {
							bookmarks: recentBookmarks,
							recitations: recentRecitations
						}
					}
				});

			case 'clear-bookmarks':
				// Clear only bookmarks
				const bookmarkResult = await BookmarkModel.deleteMany({});
				return NextResponse.json({
					success: true,
					message: 'All bookmarks cleared',
					data: { deletedBookmarks: bookmarkResult.deletedCount }
				});

			case 'clear-recitations':
				// Clear only recitations
				const recitationResult = await RecitationHistoryModel.deleteMany({});
				return NextResponse.json({
					success: true,
					message: 'All recitations cleared',
					data: { deletedRecitations: recitationResult.deletedCount }
				});

			default:
				return NextResponse.json({ 
					error: 'Invalid action. Available actions: clear, stats, clear-bookmarks, clear-recitations' 
				}, { status: 400 });
		}

	} catch (error) {
		console.error('Admin API error:', error);
		return NextResponse.json({ 
			error: 'Failed to perform admin operation' 
		}, { status: 500 });
	}
}

// GET method for quick stats
export async function GET() {
	try {
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}

		const bookmarkCount = await BookmarkModel.countDocuments();
		const recitationCount = await RecitationHistoryModel.countDocuments();
		
		return NextResponse.json({
			success: true,
			data: {
				bookmarks: bookmarkCount,
				recitations: recitationCount,
				total: bookmarkCount + recitationCount
			}
		});

	} catch (error) {
		console.error('Admin API error:', error);
		return NextResponse.json({ 
			error: 'Failed to get database stats' 
		}, { status: 500 });
	}
}
