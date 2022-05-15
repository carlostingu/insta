import dotenv from 'dotenv';
import Instagram from 'instagram-web-api';

import fs from 'fs';

dotenv.config();

const instagram = new Instagram({ 
	username: process.env.IG_ME_USER, 
	password: process.env.IG_ME_PASS
});

var followedsCount = 0;
var logPath = './logs.txt';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	try {
		await instagram.login();

		const igTarget = await instagram.getUserByUsername({
			username: process.env.IG_TARGET_USER
		});

		const targetEdges = igTarget.edge_owner_to_timeline_media.edges;
		const targetPageInfo = igTarget.edge_owner_to_timeline_media.page_info;

		var posts = [];
		targetEdges.map(({ node: post }) => {
			if (!post.is_video) posts = [...posts, post];
		});

		for (var i = 0; i < posts.length; i++) {
			var post = posts[i];
			var likers = await instagram.getMediaLikes({
				shortcode: post.shortcode,
				first: '49'
			});

			post._likers = [];
			likers.edges.map(({ node: liker }) => post._likers = [...post._likers, liker]);

			await followLikers(post);
		}
	} catch (error) {
		console.log('erro ao conectar!')
	}
})();

async function followLikers(post) {	
	for (var i = 0; i < post._likers.length; i++) {
		const { id, username } = post._likers[i];

		const logs = fs.readFileSync(logPath, { flag: 'a+' });
		if (logs && logs.indexOf(id) === -1) {
			if (followedsCount < process.env.IG_FOLLOW_QTT) {
				try {
					await instagram.follow({ userId: id });
					followedsCount++;

					fs.createWriteStream(logPath, { flags: 'a' })
					.write(`${ id } | ${ username }\n`);

					console.log(`${ followedsCount } - ${ id } \u2713`);

					await sleep(process.env.IG_PEER_FOLLOW_ITV);
				} catch (error) {}
			} else {
				followedsCount = 0;
				i = i - 1;

				await sleep(process.env.IG_FOLLOW_ITV);
			}
		}
	}
}