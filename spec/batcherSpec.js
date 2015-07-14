describe("batcher test suit:", function () {

    var batcher, dataStructure;

    function setUpTest() {
        dataStructure = buildDataStructure();
        batcher = buildBatcher(dataStructure);
    }

    function generateDataSequence(length) {
        return _.range(length).map(function (i) {
            var obj = {};
            obj[i] = i;
            return obj;
        });
    }

    function assumeAmountOfRegisteredCallbacks(num) {
        var callbacks = _.range(num).map(function (i) {
            return jasmine.createSpy('callback_' + i);
        });
        callbacks.forEach(function (f) {
            batcher.uponCompletion(f);
        });
        return callbacks;
    }

    function setSequence(seq) {
        seq.forEach(function (dataToSet) {
            batcher.setData(dataToSet);
        });
    }

    function assumeNumOfRegisteredOperation(numOfOperations) {
        var dataObjectsArr = generateDataSequence(numOfOperations);
        setSequence(dataObjectsArr);
    }

    function expectCallbacksNotHaveBeenCalled(callbacks) {
        callbacks.forEach(function (f) {
            expect(f).not.toHaveBeenCalled();
        });
    }

    function expectToBeCalledOnce(callbacks) {
        expectNumOfCalls(callbacks, 1);
    }

    function expectNumOfCalls(callbacks, numOfCalls) {
        callbacks.forEach(function (f) {
            expect(f.calls.count()).toBe(numOfCalls);
        });
    }

    describe('flushing:', function () {

        beforeEach(setUpTest);

        it("should combine several operations to one setData invocation", function () {
            assumeNumOfRegisteredOperation(3);

            expect(dataStructure.getCounter()).toBe(0);
            batcher.flush();
            expect(dataStructure.getCounter()).toBe(1);
        });

        it("should return the number of operation flushed", function () {
            var operationCount = 5;
            assumeNumOfRegisteredOperation(operationCount);

            expect(batcher.flush()).toBe(operationCount);
        });

        it("should merge the dataToSet into one object (on multiple keys remember only the last", function () {
            setSequence([{'multipleKey': 'firstValue'}, {'multipleKey': 'lastValue'}]);
            batcher.flush();
            expect(dataStructure._data).toEqual({'multipleKey': 'lastValue'});
        });

    });

    describe('UponCompletion:', function () {

        beforeEach(setUpTest);

        it("should call the callback after flushing", function () {
            var callbacks = assumeAmountOfRegisteredCallbacks(1);
            assumeNumOfRegisteredOperation(3);

            expectCallbacksNotHaveBeenCalled(callbacks);
            batcher.flush();
            expectToBeCalledOnce(callbacks);
        });

        it("should allowed multiple callbacks", function () {
            var callbacks = assumeAmountOfRegisteredCallbacks(2);
            assumeNumOfRegisteredOperation(3);

            expectCallbacksNotHaveBeenCalled(callbacks);
            batcher.flush();
            expectToBeCalledOnce(callbacks);
        });

        it("should not called the callbacks when nothing were flushed (even though flush() was called)", function () {
            var callbacks = assumeAmountOfRegisteredCallbacks(2);

            batcher.flush();
            expectCallbacksNotHaveBeenCalled(callbacks);
        });

    });

    describe('Async execution:', function () {

        beforeEach(setUpTest);


        it("without flushing, the setData operation is asynchronous", function () {
            assumeNumOfRegisteredOperation(3);
            expect(dataStructure._data).toEqual({});
            expect(dataStructure.getCounter()).toBe(0);
        });

        it("setData should flush itself on the next tick", function (done) {
            assumeNumOfRegisteredOperation(3);

            expect(dataStructure.getCounter()).toBe(0);

            setTimeout(function () {
                expect(dataStructure.getCounter()).toBe(1);
                done();
            }, 200);
        });

        it("setData on different ticks should NOT be batched to one invocation", function (done) {
            assumeNumOfRegisteredOperation(3);

            setTimeout(function () {
                assumeNumOfRegisteredOperation(3);
            }, 0);

            setTimeout(function () {
                expect(dataStructure.getCounter()).toBe(2);
                done();
            }, 200);
        });

        it("calling flush() after self-flusing should have no effect (because there shouldn't be anything to flush)", function (done) {
            assumeNumOfRegisteredOperation(3);

            setTimeout(function () {
                var numOfFlushedOperation = batcher.flush();
                expect(dataStructure.getCounter()).toBe(1);
                expect(numOfFlushedOperation).toBe(0);
                done();
            }, 200);
        });

    });

});
