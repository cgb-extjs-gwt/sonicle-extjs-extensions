/*
 * Sonicle ExtJs UX
 * Copyright (C) 2015 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 */
Ext.define('Sonicle.upload.Uploader', {
	requires: [
		'Sonicle.upload.Model'
	],
	mixins: [
		'Ext.mixin.Observable'
	],
	
	/**
	 * @event uploaderready
	 * When the underlying uploader component has been inited
	 * @param {Sonicle.upload.Uploader} this
	 */
	
	/**
	 * @event beforeuploaderstart
	 * Before start() method is called on the uploader component
	 * @param {Sonicle.upload.Uploader} this
	 */
	
	/**
	 * @event filesadded
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object[]} files Current files data
	 */
	
	/**
	 * @event fileuploaded
	 * When a file is successfully uploaded
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object} file File data
	 * @param {Object} json Server response
	 * @param {Object} json.data Custom response data
	 * @param {Object} response The server raw HTTP response object
	 */
	
	/**
	 * @event uploaderror
	 * When a file upload encounters an error
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object} file File data
	 * @param {String} cause The error cause (size, ext, server or null)
	 * @param {Object} json Response JSON if present
	 */
	
	/**
	 * @event beforeupload
	 * Before upload process has been started
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object} file File data
	 */
	
	/**
	 * @event uploadstarted
	 * When a file upload has been started
	 * @param {Sonicle.upload.Uploader} this
	 */
	
	/**
	 * @event uploadcomplete
	 * When an upload has been completed (status changed to completed)
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object[]} succeededfiles Succeeded files data
	 * @param {Object[]} failedfiles Failed files data
	 */
	
	/**
	 * @event uploadprogress
	 * When an upload is in progress
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Object} file File data
	 * @param {Number} percent Current upload process percentage
	 */
	
	/**
	 * @event overallprogress
	 * @param {Sonicle.upload.Uploader} this
	 * @param {Number} percent Overall process percentage
	 * @param {Number} total Total count of handled files (in any state)
	 * @param {Number} succeeded Total count of succeded uploads
	 * @param {Number} failed Total count of failed uploads
	 * @param {Number} pending Total count of pending uploads
	 * @param {Number} speed Overall process speed
	 */
	
	statics: {
		/**
		 * Adds passed mimeType and related extensions to moxie internal 
		 * structures. (see moxie.core.utils.Mime.addMimeType() method)
		 * @param {String} mimeType The content mimeType.
		 * @param {String/String[]} extension File extensions to register within mimeType.
		 */
		registerMimeType: function(mimeType, extension) {
			if(!moxie) return;
			if(!Ext.isArray(extension)) extension = [extension];
			var mm = moxie.core.utils.Mime,
					exts = mm.extensions[mimeType] || [];
			
			Ext.iterate(extension, function(ext) {
				if(exts.indexOf(ext) === -1) exts.push(ext);
			});
			mm.addMimeType(Ext.String.format('{0},{1}', mimeType, exts.join(' ')));
		}
	},
	
	config: {
		autoStart: true,
		autoRemoveUploaded: true,
		url: null,
		extraParams: null,
		mimeTypes: [],
		maxFileSize: '128mb',
		preventDuplicates: true,
		multiSelection: true,
		uniqueNames: true,
		runtimes: null,
		container: null,
		browseButton: null,
		dropElement: null,
		flashSwfUrl: null,
		silverlightXapUrl: null,
		pluploadConfig: null // Direct config to apply
	},
	
	fileExtraParams: null,
	
	pluOptions: null,
	
	constructor: function(owner, cfg) {
		var me = this;
		me.owner = owner;
		me.succeeded = [];
		me.failed = [];
		
		me.initConfig(cfg);
		me.mixins.observable.constructor.call(me, cfg);
		
		me.store = Ext.create('Ext.data.JsonStore', {
			model: 'Sonicle.upload.Model',
			listeners: {
				load: me.onStoreLoad,
				remove: me.onStoreRemove,
				update: me.onStoreUpdate,
				scope: me
			}
		});
		
		Ext.Function.interceptAfter(me, 'setExtraParams', function() {
			me.refreshPluOptions();
		});
	},
	
	destroy: function() {
		var me = this;
		if(me.uploader) {
			me.uploader.unbindAll();
			me.uploader.destroy();
			me.uploader = null;
			me.pluOptions = null;
		}
		if(me.store) {
			me.store.destroy();
			me.store = null;
		}
		me.callParent();
	},
	
	getStore: function() {
		return this.store;
	},
	
	mergeExtraParams: function(obj) {
		var me = this;
		me.setExtraParams(Ext.apply(me.getExtraParams() || {}, obj));
	},
	
	removeAll: function() {
		var me = this;
		me.store.each(function(rec) {
			if(rec) me.removeFile(rec.get('id'));
		});
	},
	
	removeUploaded: function() {
		var me = this;
		me.store.each(function(rec) {
			if(rec && (rec.get('status') === 5)) {
				me.removeFile(rec.get('id'));
			}
		});
	},
	
	removeFile: function(id) {
		var me = this,
				file = me.uploader.getFile(id);
		if(file) {
			me.uploader.removeFile(file);
		} else {
			me.store.remove(me.store.getById(id));
		}
	},
	
	cancel: function() {
		this.uploader.stop();
	},
	
	start: function() {
		var me = this;
		me.fireEvent('beforeuploaderstart', me);
		me.uploader.start();
	},
	
	/**
	 * @private
	 */
	buildPluploadUrl: function(url, extraParams) {
		return Ext.String.urlAppend(url, Ext.Object.toQueryString(extraParams || {}));
	},
	
	/**
	 * @private
	 */
	buildPluOptions: function() {
		var me = this, pluopts;
		
		pluopts = Ext.apply({}, me.getPluploadConfig() || {}, {
			browse_button: me.getBrowseButton(),
			url: me.buildPluploadUrl(me.getUrl(), me.getExtraParams()),
			filters: {
				mime_types: me.getMimeTypes(),
				max_file_size: me.getMaxFileSize(),
				preventDuplicates: me.getPreventDuplicates()
			},
			multipart: true,
			multipart_params: {},
			chunk_size: 0, // Disabled
			//chunk_size: '1mb', // @see http://www.plupload.com/punbb/viewtopic.php?id=1259
			resize: null,
			multi_selection: me.getMultiSelection(),
			required_features: null,
			unique_names: me.getUniqueNames(),
			runtimes: me.getRuntimes(),
			container: me.getContainer(),
			drop_element: me.getDropElement(),
			flash_swf_url: me.getFlashSwfUrl(),
			silverlight_xap_url: me.getSilverlightXapUrl()
		});
		
		if(!pluopts.runtimes) {
			var runtimes = ['html5'];
			pluopts.flash_swf_url && runtimes.push('flash');
			pluopts.silverlight_xap_url && runtimes.push('silverlight');
			runtimes.push('html4');
			pluopts.runtimes = runtimes.join(',');
		}
		if(!pluopts.container) {
			pluopts.container = Ext.fly(pluopts.browse_button).parent().id;
		}
		
		return pluopts;
	},
	
	refreshPluOptions: function() {
		var me = this, opt;
		if(me.inited) {
			me.pluOptions = me.buildPluOptions();
			if(me.uploader) {
				me.uploader.setOption('url', me.pluOptions.url);
				/*
				for(opt in me.pluOptions) {
					me.uploader.setOption(opt, me.pluOptions[opt]);
				}
				*/
			}
		}
	},
	
	/**
	 * @private
	 */
	init: function() {
		var me = this;
		if(!me.inited) {
			me.inited = true;
			me.initUploader();
		}
	},
	
	/**
	 * @private
	 */
	fireOverallProgress: function() {
		var me = this,
				progress = me.uploader.total,
				speed = progress.bytesPerSec,
				total = me.store.data.length,
				failed = me.failed.length,
				succeeded = me.succeeded.length,
				pending = total - (succeeded + failed),
				percent = progress.percent;
		
		me.fireEvent('overallprogress', me, percent, total, succeeded, failed, pending, speed);		
	},
	
	/**
	 * @private
	 */
	updateStore: function(v) {
		var me = this,
				rec = me.store.getById(v.id),
				data;
		
		data = {
			id: v.id,
			name: v.name,
			size: v.size,
			percent: v.percent,
			status: v.status,
			loaded: v.loaded
		};
		
		if(rec) {
			rec.set(data);
			rec.commit();
		} else {
			me.store.loadData([data], true);
		}
	},
	
	onStoreLoad: function(sto, rec, op) {
		this.fireOverallProgress();
	},
	
	onStoreRemove: function(sto, rec, op) {
		var me = this;
		
		if(sto.count() <= 0) {
			me.uploader.total.reset();
			me.fireEvent('storeempty', me);
		}
		
		var id = rec[0].get('id');
		Ext.each(me.succeeded, function(v) {
			if(v && v.id === id) Ext.Array.remove(me.succeeded, v);
		});
		Ext.each(me.failed, function(v) {
			if(v && v.id === id) Ext.Array.remove(me.failed, v);
		});
		
		me.fireOverallProgress();
	},
	
	onStoreUpdate: function(sto, rec, op) {
		this.fireOverallProgress();
	},
	
	enable: function() {
		console.log('TODO: Uploader.enable()');
	},
	
	disable: function() {
		console.log('TODO: Uploader.disable()');
	},
	
	/**
	 * @private
	 */
	initUploader: function() {
		var me = this;
		
		me.pluOptions = me.buildPluOptions();
		me.uploader = Ext.create('plupload.Uploader', me.pluOptions);
		
		Ext.each([
			'Init',
			'PostInit',
			'Refresh',
			'StateChanged',
			'QueueChanged',
			'BeforeUpload',
			'UploadFile',
			'UploadProgress',
			'FileUploaded',
			'ChunkUploaded',
			'FilesAdded',
			'FilesRemoved',
			'Error'
		], function (v) {
			me.uploader.bind(v, eval("me._" + v), me);
		}, me);

		me.uploader.init();
	},
	
	_Init: function(plu, data) {
		this.runtime = data.runtime;
		this.fireEvent('uploaderready', this);
	},
	
	_PostInit: function(plu) {
		// Do nothing...
	},
	
	_Refresh: function(upl) {
		Ext.each(upl.files, function(file) {
			this.updateStore(file);
		}, this);
	},
	
	_StateChanged: function(plu) {
		var me = this;
		if (plu.state === 2) {
			me.fireEvent('uploadstarted', me);
		} else {
			me.fireEvent('uploadcomplete', me, me.succeeded, me.failed);
			if (me.getAutoRemoveUploaded()) me.removeUploaded();
		}
	},
	
	_QueueChanged: function(plu) {
		// Do nothing...
	},
	
	_BeforeUpload: function(plu, file) {
		plu.setOption('multipart_params', file._extraParams || {});
		this.fireEvent('beforeupload', this, file);
	},
	
	_UploadFile: function(plu, file) {
		// Do nothing...
	},
	
	_UploadProgress: function(plu, file) {
		var me = this,
				percent = file.percent;
		
		me.fireEvent('uploadprogress', me, file, percent);
		if (file._serverError) file.status = 4;
		me.updateStore(file);
	},
	
	_FileUploaded: function(plu, file, response) {
		var me = this,
				json = Ext.JSON.decode(response.response);
		
		if(json.success === true) {
			file._serverError = 0;
			file._serverResponse = json.data;
			me.updateStore(file);
			me.succeeded.push(file);
			me.fireOverallProgress();
			me.fireEvent('fileuploaded', me, file, json, response);
		} else {
			file._serverError = 1;
			file._serverResponse = json.message;
			me.failed.push(file);
			me.fireOverallProgress();
			me.fireEvent('uploaderror', me, file, 'server', json);
		}
	},
	
	_ChunkUploaded: function() {
		// Do nothing...
	},
	
	_FilesAdded: function(plu, files) {
		var me = this,
			fep = Ext.isFunction(me.fileExtraParams) ? me.fileExtraParams.apply(me, [files]) : null;
			//sfep = fep ? Ext.JSON.encode(fep) : '';
		
		Ext.each(files, function(file) {
			if(fep) file._extraParams = fep;
			me.updateStore(file);
		});
		
		if(me.fireEvent('filesadded', me, files) !== false) {
			if(me.getAutoStart() && plu.state !== 2) {
				Ext.defer(function() {
					me.start();
				});
			}
		}
	},
	
	_FilesRemoved: function(plu, files) {
		var me = this;
		Ext.each(files, function(file) {
			me.store.remove(me.store.getById(file.id));
		}, me);
	},
	
	_Error: function(plu, data) {
		var me = this, cause = null;
		if (data.file) {
			data.file.status = 4;
			me.failed.push(data.file);
			me.updateStore(data.file);
		}
		if (data.code === -500) return; // Simply ignore init errors
		if (data.code === -600) cause = 'size';
		if (data.code === -700) cause = 'ext';
		me.fireEvent('uploaderror', me, data.file, cause, null);
		//if(data.code === -600) me.fireEvent('invalidfilesize', me, data.file);
		//if(data.code === -700) me.fireEvent('invalidfileext', me, data.file);
	}
});
